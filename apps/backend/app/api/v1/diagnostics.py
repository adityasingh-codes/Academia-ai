from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.models import SubjectSpace, SyllabusNode, User
from app.schemas.diagnostic_schema import RootCauseDiagnostic
from app.services.prerequisite_tracer import trace_root_cause

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.get("/trace-root-cause/{node_id}", response_model=RootCauseDiagnostic)
async def trace(node_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    node = await db.scalar(select(SyllabusNode).join(SubjectSpace).where(SyllabusNode.id == node_id, SubjectSpace.user_id == user.id))
    if not node:
        raise HTTPException(status_code=404, detail="Syllabus node not found")
    try:
        result = await trace_root_cause(db, user.id, node.id)
        await db.commit()
        return result
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
