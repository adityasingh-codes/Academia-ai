import json
from collections import Counter
from uuid import UUID

from openai import APIError, APITimeoutError, AsyncOpenAI, RateLimitError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import MistakeTaxonomy, QuestionVariantLog, SessionLog
from app.schemas.variant_schema import VariantBatchResponse

TIERS = {"easy": "EASY", "easy_medium": "EASY_MEDIUM", "medium": "MEDIUM", "medium_hard": "MEDIUM_HARD", "hard": "HARD"}
TECHNIQUES = "PARAMETER_CHANGE, APPROACH_REVERSAL, SOLUTION_EXPANSION, SURFACE_REPHRASING, ALTERNATE_METHOD"


def _normalise_split(split: dict) -> dict[str, int]:
    aliases = {"easyMedium": "easy_medium", "easy-medium": "easy_medium", "mediumHard": "medium_hard", "medium-hard": "medium_hard"}
    output = {tier: 0 for tier in TIERS}
    for key, value in split.items():
        key = aliases.get(key, key)
        if key not in output or not isinstance(value, int) or value < 0:
            raise ValueError("Invalid difficulty split")
        output[key] = value
    return {TIERS[key]: value for key, value in output.items()}


def build_variant_system_prompt(total_questions: int, tier_counts: dict[str, int]) -> str:
    if total_questions < 1 or sum(tier_counts.values()) != total_questions:
        raise ValueError("Difficulty split must sum exactly to total questions")
    counts = ", ".join(f"{tier}: {count}" for tier, count in tier_counts.items())
    return (
        "Generate original assessment variants strictly grounded in the supplied RAG context and logged topic. "
        "Never introduce outside-syllabus concepts, facts, formulas, or methods. Do not repeat the student's question. "
        f"Generate exactly {total_questions} questions with this exact tier distribution: {counts}. "
        f"Each question must use one technique from: {TECHNIQUES}. Ensure each solution is correct, complete, and self-contained."
    )


def _openai_schema(value):
    if isinstance(value, dict):
        return {key: _openai_schema(item) for key, item in value.items() if key not in {"title", "minLength", "maxLength", "minimum"}}
    return [_openai_schema(item) for item in value] if isinstance(value, list) else value


def _validate_batch(batch: VariantBatchResponse, session: SessionLog, tiers: dict[str, int]) -> None:
    if batch.total_generated != session.total_questions_attempted or len(batch.variants) != session.total_questions_attempted:
        raise ValueError("Generated count does not match the session")
    if batch.target_node_id != str(session.node_id) or Counter(item.difficulty_tier for item in batch.variants) != Counter(tiers):
        raise ValueError("Generated target or difficulty distribution is invalid")


async def generate_novel_variants(db_session: AsyncSession, session_id: UUID, RAG_context: str) -> VariantBatchResponse:
    session = await db_session.scalar(select(SessionLog).where(SessionLog.id == session_id))
    if not session:
        raise ValueError("Session not found")
    tiers = _normalise_split(session.difficulty_split)
    system = build_variant_system_prompt(session.total_questions_attempted, tiers)
    material = {"target_node_id": str(session.node_id), "rag_context": RAG_context, "uploaded_solution_urls": session.uploaded_solution_urls or []}
    client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    schema = _openai_schema(VariantBatchResponse.model_json_schema())
    for attempt in range(2):
        try:
            response = await client.responses.create(model="gpt-4o-mini", instructions=system, input=json.dumps(material), text={"format": {"type": "json_schema", "name": "variant_batch", "strict": True, "schema": schema}})
            batch = VariantBatchResponse.model_validate_json(response.output_text)
            _validate_batch(batch, session, tiers)
            db_session.add_all(QuestionVariantLog(session_id=session.id, original_question_data={"uploaded_solution_urls": session.uploaded_solution_urls or [], "rag_context": RAG_context}, generated_variant_data=item.model_dump(), difficulty_tier=item.difficulty_tier, student_answer=None, is_correct=None, mistake_taxonomy=MistakeTaxonomy.NONE) for item in batch.variants)
            await db_session.flush()
            return batch
        except (APIError, APITimeoutError, RateLimitError, ValidationError, ValueError, TypeError) as exc:
            if attempt:
                raise ValueError("Variant generation failed validation") from exc
    raise RuntimeError("Unreachable")
