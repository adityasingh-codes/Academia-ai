from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.models import SessionLog, SubjectSpace, SyllabusNode, User
from app.schemas import SessionLogCreate, SessionLogResponse
from app.schemas.assessment_schema import AssessmentSubmission
from app.services.gap_calculator import process_session_gap_analysis
from app.services.rag_ingestion import get_node_rag_context
from app.services.variant_generator import generate_novel_variants

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/log", response_model=SessionLogResponse, status_code=status.HTTP_201_CREATED)
async def log_session(payload: SessionLogCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    node = await db.scalar(select(SyllabusNode).join(SubjectSpace).where(SyllabusNode.id == payload.node_id, SubjectSpace.user_id == user.id))
    if not node:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Syllabus node not found")
    data = payload.model_dump()
    data["practice_assessment_gap"] = data["self_reported_accuracy"] - data["app_variant_accuracy"]
    session = SessionLog(user_id=user.id, **data)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/{session_id}/generate-variants")
async def generate_variants(session_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.scalar(select(SessionLog).where(SessionLog.id == session_id, SessionLog.user_id == user.id))
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    node = await db.scalar(select(SyllabusNode).where(SyllabusNode.id == session.node_id))
    if not node:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Syllabus node not found")
    try:
        context = await get_node_rag_context(node.subject_id, node.id)
        if not context:
            raise ValueError("No syllabus context is indexed for this topic")
        result = await generate_novel_variants(db, session.id, context)
        await db.commit()
        return result
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Variant generation failed") from exc


@router.post("/{session_id}/submit-assessment")
async def submit_assessment(session_id: UUID, payload: AssessmentSubmission, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(SessionLog.id).where(SessionLog.id == session_id, SessionLog.user_id == user.id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    try:
        result = await process_session_gap_analysis(db, session_id, [answer.model_dump() for answer in payload.answers])
        await db.commit()
        return result
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Assessment analysis failed") from exc
