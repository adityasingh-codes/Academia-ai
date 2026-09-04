from uuid import UUID

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.models import SubjectSpace, SyllabusNode, User
from app.schemas.diagnostic_schema import RootCauseDiagnostic
from app.schemas.diagnostic_schema import KnowledgeGraphPayload
from app.services.prerequisite_tracer import PrerequisiteTracerService, trace_root_cause
from app.api.v1.nodes import load_knowledge_graph

router = APIRouter()
logger = logging.getLogger(__name__)


class RemediationPathRequest(BaseModel):
    document_id: str = Field(min_length=1)
    weak_node_ids: list[str] = Field(min_length=1)


@router.post("/remediation-path", response_model=list[str], status_code=status.HTTP_200_OK)
async def remediation_path(payload: RemediationPathRequest) -> list[str]:
    try:
        graph: KnowledgeGraphPayload = await asyncio.to_thread(load_knowledge_graph, payload.document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Knowledge graph not found") from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OSError as exc:
        logger.exception("Knowledge graph lookup failed for remediation request")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Knowledge graph could not be loaded") from exc
    try:
        return await asyncio.to_thread(
            PrerequisiteTracerService().build_learning_path,
            graph,
            payload.weak_node_ids,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Remediation path generation failed for %s", payload.document_id)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Remediation path generation failed") from exc


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
