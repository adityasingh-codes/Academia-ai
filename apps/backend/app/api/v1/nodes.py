from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.models import SubjectSpace, SyllabusNode, User
from app.schemas import NodeCreate, NodeResponse

router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.post("/bulk", response_model=list[NodeResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create(payload: list[NodeCreate], user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not payload or len({node.subject_id for node in payload}) != 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide one or more nodes for exactly one subject")
    subject_id = payload[0].subject_id
    if not await db.scalar(select(SubjectSpace.id).where(SubjectSpace.id == subject_id, SubjectSpace.user_id == user.id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    nodes = [SyllabusNode(**node.model_dump()) for node in payload]
    db.add_all(nodes)
    await db.commit()
    for node in nodes:
        await db.refresh(node)
    return nodes


@router.get("/tree/{subject_id}", response_model=list[NodeResponse])
async def tree(subject_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(SubjectSpace.id).where(SubjectSpace.id == subject_id, SubjectSpace.user_id == user.id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    return (await db.scalars(select(SyllabusNode).where(SyllabusNode.subject_id == subject_id).order_by(SyllabusNode.position_order))).all()
