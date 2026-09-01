import asyncio
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import get_current_user
from app.database import get_db
from app.models.models import SubjectSpace, SyllabusNode, User
from app.schemas import BoundaryCheckRequest, SubjectResponse
from app.services.syllabus_parser import process_pdf_and_create_nodes
from app.services.rag_ingestion import check_question_in_syllabus, chunk_pdf, embed_and_store_chunks, get_vector_client

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.post("/create-with-pdf", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_with_pdf(title: str = Form(...), file: UploadFile = File(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not title.strip() or not (file.content_type == "application/pdf" or (file.filename or "").lower().endswith(".pdf")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A title and PDF file are required")
    directory = Path(get_settings().upload_dir)
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4()}.pdf"
    path = directory / filename
    try:
        path.write_bytes(await file.read())
    finally:
        await file.close()
    subject = SubjectSpace(user_id=user.id, title=title.strip(), full_pdf_url=f"/uploads/{filename}")
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.get("/", response_model=list[SubjectResponse])
async def list_subjects(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(SubjectSpace).where(SubjectSpace.user_id == user.id).order_by(SubjectSpace.created_at.desc()))).all()


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    subject = await db.scalar(select(SubjectSpace).where(SubjectSpace.id == subject_id, SubjectSpace.user_id == user.id))
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    await db.delete(subject)
    await db.commit()


@router.post("/{subject_id}/parse-pdf", status_code=status.HTTP_201_CREATED)
async def parse_pdf(subject_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    subject = await db.scalar(select(SubjectSpace).where(SubjectSpace.id == subject_id, SubjectSpace.user_id == user.id))
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    if not subject.full_pdf_url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Subject has no PDF")
    if await db.scalar(select(SyllabusNode.id).where(SyllabusNode.subject_id == subject.id)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Syllabus nodes already exist for this subject")
    path = Path(get_settings().upload_dir).resolve() / Path(subject.full_pdf_url).name
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Uploaded PDF not found")
    try:
        chapters, topics = await process_pdf_and_create_nodes(db, subject.id, str(path))
        await db.commit()
    except (OSError, ValueError) as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Curriculum parsing failed") from exc
    return {"status": "success", "total_chapters": chapters, "total_topics": topics}


@router.post("/{subject_id}/vectorize", status_code=status.HTTP_201_CREATED)
async def vectorize(subject_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    subject = await db.scalar(select(SubjectSpace).where(SubjectSpace.id == subject_id, SubjectSpace.user_id == user.id))
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    path = Path(get_settings().upload_dir).resolve() / Path(subject.full_pdf_url or "").name
    nodes = (await db.scalars(select(SyllabusNode).where(SyllabusNode.subject_id == subject.id))).all()
    if not subject.full_pdf_url or not path.is_file() or not nodes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A PDF and parsed syllabus nodes are required")
    try:
        chunks = await asyncio.to_thread(chunk_pdf, str(path), 500, 50, subject.id, nodes)
        total = await embed_and_store_chunks(subject.id, chunks, get_vector_client(), db)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Vector ingestion failed") from exc
    return {"status": "success", "total_chunks": total}


@router.post("/{subject_id}/verify-boundary")
async def verify_boundary(subject_id: UUID, payload: BoundaryCheckRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(SubjectSpace.id).where(SubjectSpace.id == subject_id, SubjectSpace.user_id == user.id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    try:
        return await check_question_in_syllabus(subject_id, payload.question)
    except Exception as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Boundary verification failed") from exc
