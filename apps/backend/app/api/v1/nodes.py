import asyncio
import json
import logging
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.models import SubjectSpace, SyllabusNode, User
from app.schemas import NodeCreate, NodeResponse
from app.schemas.diagnostic_schema import KnowledgeGraphPayload
from app.services.rag_ingestion import RAGIngestionService
from app.services.syllabus_parser import SyllabusParserService

router = APIRouter()
logger = logging.getLogger(__name__)

BACKEND_STORAGE = Path(__file__).resolve().parents[3] / "storage"
TEMP_DIRECTORY = BACKEND_STORAGE / "temp"
GRAPH_DIRECTORY = BACKEND_STORAGE / "knowledge_graphs"
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".epub"}
MAX_UPLOAD_BYTES = 100 * 1024 * 1024


def _graph_path(document_id: str) -> Path:
    if not document_id or Path(document_id).name != document_id:
        raise ValueError("Invalid document_id")
    return GRAPH_DIRECTORY / f"{document_id}.json"


def load_knowledge_graph(document_id: str) -> KnowledgeGraphPayload:
    path = _graph_path(document_id)
    if not path.is_file():
        raise FileNotFoundError(document_id)
    return KnowledgeGraphPayload.model_validate_json(path.read_text(encoding="utf-8"))


async def _save_upload(upload: UploadFile, destination: Path) -> None:
    size = 0
    with destination.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                raise ValueError("Uploaded file exceeds the 100 MB limit")
            output.write(chunk)


@router.post("/upload-material", status_code=status.HTTP_200_OK)
async def upload_material(file: UploadFile = File(...)) -> dict:
    filename = Path(file.filename or "").name
    suffix = Path(filename).suffix.lower()
    if not filename or suffix not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only PDF and EPUB files are supported")

    document_id = f"doc_{uuid4().hex}"
    TEMP_DIRECTORY.mkdir(parents=True, exist_ok=True)
    GRAPH_DIRECTORY.mkdir(parents=True, exist_ok=True)
    temporary_path = TEMP_DIRECTORY / f"{document_id}{suffix}"
    try:
        await _save_upload(file, temporary_path)
        ingestion = RAGIngestionService()
        pages = await asyncio.to_thread(ingestion.extract_text_with_metadata, str(temporary_path))
        chunks = await asyncio.to_thread(ingestion.create_semantic_chunks, pages, document_id)
        if not chunks:
            raise ValueError("No extractable text was found in the uploaded document")
        ingestion_summary = await asyncio.to_thread(
            ingestion.process_and_store_document,
            str(temporary_path),
            document_id,
        )
        graph = await asyncio.to_thread(
            SyllabusParserService().extract_knowledge_graph,
            chunks,
            document_id,
        )
        graph_path = _graph_path(document_id)
        graph_path.write_text(json.dumps(graph.model_dump(mode="json"), ensure_ascii=True), encoding="utf-8")
        return {
            "status": "completed",
            "file_name": filename,
            "ingestion_summary": ingestion_summary,
            "knowledge_graph": graph.model_dump(mode="json"),
        }
    except ValueError as exc:
        logger.warning("Material upload rejected for %s: %s", filename, exc)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Material upload failed for %s", filename)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Material processing failed") from exc
    finally:
        try:
            temporary_path.unlink(missing_ok=True)
        except OSError:
            logger.exception("Failed to remove temporary upload %s", temporary_path)


@router.get("/graph/{document_id}", response_model=KnowledgeGraphPayload, status_code=status.HTTP_200_OK)
async def get_graph(document_id: str) -> KnowledgeGraphPayload:
    try:
        return await asyncio.to_thread(load_knowledge_graph, document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Knowledge graph not found") from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OSError as exc:
        logger.exception("Knowledge graph lookup failed for %s", document_id)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Knowledge graph could not be loaded") from exc


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
