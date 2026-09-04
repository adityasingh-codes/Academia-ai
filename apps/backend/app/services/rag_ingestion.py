import asyncio
import logging
import re
import time
import zipfile
from pathlib import Path
from typing import Any
from uuid import UUID

import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import APIError, OpenAI, RateLimitError
from pypdf import PdfReader
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.vector_store import VectorStoreManager
from app.models.models import NodeType, SyllabusNode

logger = logging.getLogger(__name__)
COLLECTION = "user_materials"
LOCAL_MODEL = "all-MiniLM-L6-v2"


def _clean_text(value: str) -> str:
    lines = [re.sub(r"\s+", " ", line).strip() for line in value.splitlines()]
    return "\n".join(line for line in lines if len(line) > 2).strip()


def _remove_repeated_page_furniture(pages: list[dict]) -> list[dict]:
    """Remove lines repeated at page boundaries without deleting page content."""
    boundary_lines: dict[str, int] = {}
    for page in pages:
        lines = page["text"].splitlines()
        for line in (lines[0], lines[-1]) if lines else ():
            normalized = re.sub(r"\s+", " ", line).strip().casefold()
            if normalized:
                boundary_lines[normalized] = boundary_lines.get(normalized, 0) + 1
    repeated = {line for line, count in boundary_lines.items() if count > 1}
    cleaned_pages = []
    for page in pages:
        lines = [
            line for line in page["text"].splitlines()
            if re.sub(r"\s+", " ", line).strip().casefold() not in repeated
        ]
        text = "\n".join(lines).strip()
        if text:
            cleaned_pages.append({**page, "text": text, "char_count": len(text)})
    return cleaned_pages


class RAGIngestionService:
    """Parse, chunk, embed, and persist educational materials in ChromaDB."""

    def __init__(self, vector_store: VectorStoreManager | None = None) -> None:
        self.settings = get_settings()
        self.vector_store = vector_store or VectorStoreManager()
        self._local_model: Any | None = None

    def extract_text_with_metadata(self, file_path: str) -> list[dict]:
        path = Path(file_path)
        if not path.is_file():
            raise FileNotFoundError(path)
        try:
            suffix = path.suffix.lower()
            if suffix == ".pdf":
                return _remove_repeated_page_furniture(self._extract_pdf(path))
            if suffix in {".txt", ".md", ".csv"}:
                text = _clean_text(path.read_text(encoding="utf-8", errors="replace"))
                return [{"page_number": 1, "text": text, "char_count": len(text)}] if text else []
            if suffix == ".epub":
                return self._extract_epub(path)
            if suffix in {".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"}:
                return self._extract_image(path)
            raise ValueError(f"Unsupported document type: {suffix or 'unknown'}")
        except Exception:
            logger.exception("Text extraction failed for %s", path.name)
            raise

    def _extract_pdf(self, path: Path) -> list[dict]:
        try:
            with pdfplumber.open(path) as pdf:
                pages = [{"page_number": number, "text": text, "char_count": len(text)} for number, page in enumerate(pdf.pages, 1) if (text := _clean_text(page.extract_text() or ""))]
            return pages
        except Exception as exc:
            logger.warning("pdfplumber failed for %s; using pypdf: %s", path.name, exc)
            reader = PdfReader(str(path))
            return [{"page_number": number, "text": text, "char_count": len(text)} for number, page in enumerate(reader.pages, 1) if (text := _clean_text(page.extract_text() or ""))]

    def _extract_epub(self, path: Path) -> list[dict]:
        with zipfile.ZipFile(path) as archive:
            html_files = [name for name in archive.namelist() if name.lower().endswith((".xhtml", ".html", ".htm"))]
            return [{"page_number": number, "text": text, "char_count": len(text)} for number, name in enumerate(html_files, 1) if (text := _clean_text(re.sub(r"<[^>]+>", " ", archive.read(name).decode("utf-8", errors="replace"))))]

    def _extract_image(self, path: Path) -> list[dict]:
        try:
            import pytesseract
            from PIL import Image
        except ImportError as exc:
            raise ValueError("Image ingestion requires Pillow and pytesseract with Tesseract OCR installed") from exc
        text = _clean_text(pytesseract.image_to_string(Image.open(path)))
        return [{"page_number": 1, "text": text, "char_count": len(text)}] if text else []

    def create_semantic_chunks(self, extracted_data: list[dict], document_id: str) -> list[dict]:
        splitter = RecursiveCharacterTextSplitter(chunk_size=self.settings.CHUNK_SIZE, chunk_overlap=self.settings.CHUNK_OVERLAP, separators=["\n\n", "\n", ". ", " ", ""])
        chunks = []
        for page in extracted_data:
            for index, content in enumerate(splitter.split_text(page["text"]), 1):
                if content := content.strip():
                    chunks.append({"document_id": document_id, "chunk_id": f"{document_id}_p{page['page_number']}_c{index}", "page_number": page["page_number"], "content": content})
        return chunks

    def _local_embeddings(self, text_list: list[str]) -> list[list[float]]:
        from sentence_transformers import SentenceTransformer

        self._local_model = self._local_model or SentenceTransformer(LOCAL_MODEL)
        return self._local_model.encode(text_list, normalize_embeddings=True).tolist()

    def generate_embeddings(self, text_list: list[str]) -> list[list[float]]:
        if not text_list:
            return []
        try:
            if self.settings.openai_api_key:
                response = OpenAI(api_key=self.settings.openai_api_key).embeddings.create(
                    model=self.settings.EMBEDDING_MODEL_NAME,
                    input=text_list,
                )
                return [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
        except (APIError, RateLimitError, OSError) as exc:
                logger.warning("OpenAI embeddings unavailable; using local fallback: %s", exc)
        try:
            return self._local_embeddings(text_list)
        except Exception:
            logger.exception("Local embedding generation failed")
            raise

    def process_and_store_document(self, file_path: str, document_id: str, collection_name: str = COLLECTION) -> dict:
        started = time.perf_counter()
        pages = self.extract_text_with_metadata(file_path)
        chunks = self.create_semantic_chunks(pages, document_id)
        if not chunks:
            raise ValueError("No extractable text was found in the document")
        embeddings = self.generate_embeddings([chunk["content"] for chunk in chunks])
        self.vector_store.upsert_chunks(collection_name, [chunk["chunk_id"] for chunk in chunks], [chunk["content"] for chunk in chunks], [{"document_id": chunk["document_id"], "page_number": chunk["page_number"]} for chunk in chunks], embeddings)
        return {"status": "success", "document_id": document_id, "total_pages_processed": len(pages), "total_chunks_created": len(chunks), "collection_name": collection_name, "processing_time_seconds": round(time.perf_counter() - started, 3)}


def get_vector_client() -> VectorStoreManager:
    return VectorStoreManager()


def chunk_pdf(pdf_path: str, chunk_size: int = 500, overlap: int = 50, subject_id: UUID | None = None, nodes: list[SyllabusNode] | None = None) -> list[dict]:
    service = RAGIngestionService()
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap, separators=["\n\n", "\n", ". ", " ", ""])
    labels = sorted(((str(node.id), node.title) for node in nodes or []), key=lambda item: len(item[1]), reverse=True)
    chapters = [(str(node.id), node.title) for node in nodes or [] if node.node_type == NodeType.CHAPTER]
    chapter, node_id, chunks = "", None, []
    for page in service.extract_text_with_metadata(pdf_path):
        for index, content in enumerate(splitter.split_text(page["text"]), 1):
            lowered = content.casefold()
            chapter = next((title for _, title in chapters if title.casefold() in lowered), chapter)
            node_id = next((matched_id for matched_id, title in labels if title.casefold() in lowered), node_id)
            chunks.append({"document_id": str(subject_id or Path(pdf_path).stem), "chunk_id": f"{subject_id or Path(pdf_path).stem}_p{page['page_number']}_c{index}", "page_number": page["page_number"], "subject_id": str(subject_id or ""), "chapter_name": chapter, "node_id": node_id, "text": content})
    return chunks


async def embed_and_store_chunks(subject_id: UUID, chunks: list[dict], vector_client: VectorStoreManager | None = None, db_session: AsyncSession | None = None) -> int:
    if not chunks:
        return 0
    store, service = vector_client or get_vector_client(), RAGIngestionService(vector_client or get_vector_client())
    embeddings = await asyncio.to_thread(service.generate_embeddings, [chunk["text"] for chunk in chunks])
    collection = COLLECTION if len(embeddings[0]) == 1536 else f"{COLLECTION}_local"
    metadata = [{key: value for key, value in chunk.items() if key in {"subject_id", "node_id", "chapter_name", "page_number", "document_id"} and value is not None} for chunk in chunks]
    await asyncio.to_thread(store.upsert_chunks, collection, [chunk["chunk_id"] for chunk in chunks], [chunk["text"] for chunk in chunks], metadata, embeddings)
    if db_session:
        for chunk in chunks:
            if chunk.get("node_id"):
                await db_session.execute(update(SyllabusNode).where(SyllabusNode.id == UUID(chunk["node_id"]), SyllabusNode.subject_id == subject_id).values(vector_embedding_id=f"{collection}:{chunk['chunk_id']}"))
        await db_session.flush()
    return len(chunks)


async def check_question_in_syllabus(subject_id: UUID, candidate_text: str, similarity_threshold: float = 0.75, vector_client: VectorStoreManager | None = None) -> dict:
    if not candidate_text.strip() or not 0 <= similarity_threshold <= 1:
        raise ValueError("Question text and a threshold from 0 to 1 are required")
    store = vector_client or get_vector_client()
    service = RAGIngestionService(store)
    embedding = (await asyncio.to_thread(service.generate_embeddings, [candidate_text]))[0]
    collection = COLLECTION if len(embedding) == 1536 else f"{COLLECTION}_local"
    result = await asyncio.to_thread(store.query_similar, collection, embedding, 1, {"subject_id": str(subject_id)})
    documents, metadata, distances = result.get("documents", [[]])[0], result.get("metadatas", [[]])[0], result.get("distances", [[]])[0]
    score = max(0.0, 1 - float(distances[0])) if distances else 0.0
    return {"is_within_syllabus": score >= similarity_threshold, "highest_similarity_score": score, "matched_context": documents[0] if documents else "", "relevant_page": metadata[0].get("page_number", 0) if metadata else 0}


async def get_node_rag_context(subject_id: UUID, node_id: UUID, limit: int = 8) -> str:
    store = get_vector_client()
    for collection in (COLLECTION, f"{COLLECTION}_local"):
        try:
            result = await asyncio.to_thread(store.get_chunks, collection, {"node_id": str(node_id)}, limit)
            if documents := result.get("documents", []):
                return "\n\n".join(documents)
        except Exception:
            logger.debug("No node context in %s", collection, exc_info=True)
    return ""
