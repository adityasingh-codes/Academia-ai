import asyncio
from pathlib import Path
from uuid import UUID

from openai import APIError, APITimeoutError, AsyncOpenAI, RateLimitError
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import NodeStatus, NodeType, SyllabusNode
from app.core.config import get_settings

MAX_SOURCE_CHARS = 300_000


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Subtopic(StrictModel):
    title: str = Field(min_length=1, max_length=255)
    position_order: int = Field(ge=1)


class Topic(StrictModel):
    title: str = Field(min_length=1, max_length=255)
    position_order: int = Field(ge=1)
    prerequisite_concepts: list[str]
    subtopics: list[Subtopic]


class Chapter(StrictModel):
    title: str = Field(min_length=1, max_length=255)
    position_order: int = Field(ge=1)
    topics: list[Topic]


class CurriculumTree(StrictModel):
    subject: str = Field(min_length=1, max_length=255)
    chapters: list[Chapter]


def _openai_schema(value):
    if isinstance(value, dict):
        return {key: _openai_schema(item) for key, item in value.items() if key not in {"title", "minLength", "maxLength", "minimum"}}
    return [_openai_schema(item) for item in value] if isinstance(value, list) else value


def extract_text_from_pdf(pdf_file_path: str, max_chars: int = MAX_SOURCE_CHARS) -> str:
    reader = PdfReader(pdf_file_path)
    pages = [f"[PAGE {index + 1}]\n{page.extract_text() or ''}" for index, page in enumerate(reader.pages)]
    text = "\n".join(pages).strip()
    if not text:
        raise ValueError("PDF contains no extractable text; OCR is required")
    if len(text) <= max_chars:
        return text
    per_page = max(800, max_chars // len(pages))
    return "\n".join(page[:per_page] for page in pages)[:max_chars]


async def build_curriculum_tree(text: str, client: AsyncOpenAI | None = None) -> CurriculumTree:
    schema = _openai_schema(CurriculumTree.model_json_schema())
    prompt = (
        "Extract the complete curriculum explicitly present in this PDF. Return only content grounded in the source; "
        "do not infer, add, or replace concepts with general Class 12/Board/JEE knowledge. Preserve the source order, "
        "use empty arrays where a level has no children, and include prerequisite concepts only when supported by the text.\n\n"
        f"SOURCE:\n{text}"
    )
    client = client or AsyncOpenAI(api_key=get_settings().openai_api_key)
    for attempt in range(2):
        try:
            response = await client.responses.create(
                model="gpt-4o-mini",
                input=prompt,
                text={"format": {"type": "json_schema", "name": "curriculum_tree", "strict": True, "schema": schema}},
            )
            return CurriculumTree.model_validate_json(response.output_text)
        except (APIError, APITimeoutError, RateLimitError, ValidationError, ValueError, TypeError) as exc:
            if attempt:
                raise ValueError("LLM returned an invalid curriculum tree") from exc
    raise RuntimeError("Unreachable")


async def ingest_tree_to_db(db_session: AsyncSession, subject_id: UUID, tree: CurriculumTree) -> tuple[int, int]:
    chapters = topics = 0
    for chapter_data in tree.chapters:
        chapter = SyllabusNode(subject_id=subject_id, title=chapter_data.title, node_type=NodeType.CHAPTER, status=NodeStatus.PENDING, position_order=chapter_data.position_order)
        db_session.add(chapter)
        await db_session.flush()
        chapters += 1
        for topic_data in chapter_data.topics:
            topic = SyllabusNode(subject_id=subject_id, parent_id=chapter.id, title=topic_data.title, node_type=NodeType.TOPIC, status=NodeStatus.PENDING, position_order=topic_data.position_order, prerequisite_ids=topic_data.prerequisite_concepts or None)
            db_session.add(topic)
            await db_session.flush()
            topics += 1
            db_session.add_all(SyllabusNode(subject_id=subject_id, parent_id=topic.id, title=subtopic.title, node_type=NodeType.SUBTOPIC, status=NodeStatus.PENDING, position_order=subtopic.position_order) for subtopic in topic_data.subtopics)
    await db_session.flush()
    return chapters, topics


async def process_pdf_and_create_nodes(db_session: AsyncSession, subject_id: UUID, pdf_file_path: str) -> tuple[int, int]:
    text = await asyncio.to_thread(extract_text_from_pdf, pdf_file_path)
    return await ingest_tree_to_db(db_session, subject_id, await build_curriculum_tree(text))
