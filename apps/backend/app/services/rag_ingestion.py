from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from uuid import UUID, uuid4

from openai import AsyncOpenAI
from pypdf import PdfReader
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import NodeType, SyllabusNode

COLLECTION = "syllabus_chunks"
VECTOR_SIZE = 1536
EMBED_BATCH_SIZE = 96


@lru_cache
def get_vector_client() -> AsyncQdrantClient:
    settings = get_settings()
    return AsyncQdrantClient(url=settings.vector_db_url, api_key=settings.vector_db_api_key)


@lru_cache
def _openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


def chunk_pdf(pdf_path: str, chunk_size: int = 500, overlap: int = 50, subject_id: UUID | None = None, nodes: list[SyllabusNode] | None = None) -> list[dict]:
    if chunk_size < 1 or not 0 <= overlap < chunk_size:
        raise ValueError("chunk_size must be positive and overlap smaller than it")
    nodes = nodes or []
    chapters = [(str(node.id), node.title) for node in nodes if node.node_type == NodeType.CHAPTER]
    labels = sorted(((str(node.id), node.title) for node in nodes), key=lambda item: len(item[1]), reverse=True)
    chunks, chapter_name, node_id = [], "", None
    for page_number, page in enumerate(PdfReader(pdf_path).pages, 1):
        text = " ".join((page.extract_text() or "").split())
        if not text:
            continue
        lowered = text.casefold()
        chapter_name = next((title for _, title in chapters if title.casefold() in lowered), chapter_name)
        node_id = next((matched_id for matched_id, title in labels if title.casefold() in lowered), node_id)
        words, step = text.split(), chunk_size - overlap
        for start in range(0, len(words), step):
            content = " ".join(words[start:start + chunk_size])
            if content:
                chunks.append({"subject_id": str(subject_id or ""), "chapter_name": chapter_name, "page_number": page_number, "node_id": node_id, "text": content})
    return chunks


async def _embeddings(texts: list[str]) -> list[list[float]]:
    response = await _openai_client().embeddings.create(model="text-embedding-3-small", input=texts, dimensions=VECTOR_SIZE)
    return [item.embedding for item in response.data]


async def _ensure_collection(client: AsyncQdrantClient) -> None:
    if not await client.collection_exists(COLLECTION):
        await client.create_collection(COLLECTION, vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE))


async def embed_and_store_chunks(subject_id: UUID, chunks: list[dict], vector_client: AsyncQdrantClient, db_session: AsyncSession | None = None) -> int:
    if not chunks:
        return 0
    await _ensure_collection(vector_client)
    node_points: dict[str, list[str]] = defaultdict(list)
    for offset in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[offset:offset + EMBED_BATCH_SIZE]
        vectors = await _embeddings([chunk["text"] for chunk in batch])
        points = []
        for chunk, vector in zip(batch, vectors):
            point_id = str(uuid4())
            points.append(PointStruct(id=point_id, vector=vector, payload=chunk))
            if chunk.get("node_id"):
                node_points[chunk["node_id"]].append(point_id)
        await vector_client.upsert(COLLECTION, points=points, wait=True)
    if db_session:
        for node_id, point_ids in node_points.items():
            await db_session.execute(update(SyllabusNode).where(SyllabusNode.id == UUID(node_id), SyllabusNode.subject_id == subject_id).values(vector_embedding_id=f"{COLLECTION}:{','.join(point_ids)}"))
        await db_session.flush()
    return len(chunks)


async def check_question_in_syllabus(subject_id: UUID, candidate_text: str, similarity_threshold: float = 0.75, vector_client: AsyncQdrantClient | None = None) -> dict:
    if not candidate_text.strip() or not 0 <= similarity_threshold <= 1:
        raise ValueError("Question text and a threshold from 0 to 1 are required")
    vector = (await _embeddings([candidate_text]))[0]
    client = vector_client or get_vector_client()
    result = await client.query_points(COLLECTION, query=vector, query_filter=Filter(must=[FieldCondition(key="subject_id", match=MatchValue(value=str(subject_id)))]), limit=1, with_payload=True)
    point = result.points[0] if result.points else None
    payload = point.payload if point else {}
    score = float(point.score) if point else 0.0
    return {"is_within_syllabus": score >= similarity_threshold, "highest_similarity_score": score, "matched_context": payload.get("text", ""), "relevant_page": payload.get("page_number", 0)}


async def get_node_rag_context(subject_id: UUID, node_id: UUID, limit: int = 8) -> str:
    records, _ = await get_vector_client().scroll(COLLECTION, scroll_filter=Filter(must=[FieldCondition(key="subject_id", match=MatchValue(value=str(subject_id))), FieldCondition(key="node_id", match=MatchValue(value=str(node_id)))]), limit=limit, with_payload=True, with_vectors=False)
    return "\n\n".join(str(record.payload.get("text", "")) for record in records if record.payload.get("text"))
