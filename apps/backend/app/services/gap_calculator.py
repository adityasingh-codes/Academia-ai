from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import ConfidenceRating, MistakeTaxonomy, NodeStatus, QuestionVariantLog, SessionLog, SyllabusNode, User


def _normalise(value: Any) -> str:
    return " ".join(str(value).casefold().split())


def _is_correct(answer: str, correct: str) -> bool:
    if _normalise(answer) == _normalise(correct):
        return True
    try:
        return Decimal(answer.strip()) == Decimal(correct.strip())
    except (InvalidOperation, AttributeError):
        return False


def _taxonomy(question: dict) -> MistakeTaxonomy:
    if question.get("technique_used") in {"ALTERNATE_METHOD", "APPROACH_REVERSAL"}:
        return MistakeTaxonomy.NOVEL_TRANSFER
    if question.get("question_type") == "NUMERICAL_INPUT":
        return MistakeTaxonomy.CALCULATION
    if question.get("question_type") == "STEP_BY_STEP_TEXT":
        return MistakeTaxonomy.PROCEDURAL
    return MistakeTaxonomy.CONCEPTUAL


def calculate_app_accuracy(submitted_answers: list[dict], variant_questions: list[dict]) -> tuple[float, list[dict]]:
    answers = {str(item["question_id"]): item for item in submitted_answers}
    results = []
    for variant in variant_questions:
        data, answer = variant["generated_variant_data"], answers.get(str(variant["id"]))
        correct = bool(answer and _is_correct(answer["student_answer"], data["correct_answer"]))
        confidence = answer.get("confidence_rating") if answer else ConfidenceRating.GUESSING
        flags = []
        if not correct and confidence in {ConfidenceRating.CONFIDENT, ConfidenceRating.VERY_CONFIDENT, "CONFIDENT", "VERY_CONFIDENT"}:
            flags.append("OVERCONFIDENCE_BIAS")
        if correct and confidence in {ConfidenceRating.GUESSING, "GUESSING"}:
            flags.append("LUCKY_GUESS_WARNING")
        results.append({"question_id": str(variant["id"]), "student_answer": answer["student_answer"] if answer else None, "confidence_rating": str(confidence.value if isinstance(confidence, ConfidenceRating) else confidence), "is_correct": correct, "mistake_taxonomy": (MistakeTaxonomy.NONE if correct else _taxonomy(data)).value, "flags": flags, "concept": data.get("concept_tested", "")})
    return (sum(item["is_correct"] for item in results) * 100 / len(results) if results else 0.0), results


async def process_session_gap_analysis(db_session: AsyncSession, session_id: UUID, submitted_answers: list[dict]) -> dict:
    session = await db_session.scalar(select(SessionLog).where(SessionLog.id == session_id))
    if not session:
        raise ValueError("Session not found")
    variants = (await db_session.scalars(select(QuestionVariantLog).where(QuestionVariantLog.session_id == session_id))).all()
    if not variants:
        raise ValueError("No generated variants found")
    raw_answers = [{**answer, "question_id": str(answer["question_id"])} for answer in submitted_answers]
    variant_data = [{"id": str(variant.id), "generated_variant_data": variant.generated_variant_data} for variant in variants]
    accuracy, results = calculate_app_accuracy(raw_answers, variant_data)
    result_map = {item["question_id"]: item for item in results}
    for variant in variants:
        result = result_map[str(variant.id)]
        variant.student_answer = result["student_answer"]
        variant.is_correct = result["is_correct"]
        variant.mistake_taxonomy = MistakeTaxonomy(result["mistake_taxonomy"])
    gap = round(session.self_reported_accuracy - accuracy, 2)
    overconfidence = sum("OVERCONFIDENCE_BIAS" in item["flags"] for item in results)
    underconfidence = sum("LUCKY_GUESS_WARNING" in item["flags"] for item in results)
    primary = "PATTERN_MEMORIZATION_RISK" if gap > 20 else "UNDERESTIMATED_MASTERY" if gap < -10 else "OVERCONFIDENCE_BIAS" if overconfidence else "LUCKY_GUESS_WARNING" if underconfidence else "CALIBRATED"
    flags = {"gap_score": gap, "memorization_risk": gap > 20, "underestimated_mastery": gap < -10, "overconfidence_count": overconfidence, "underconfidence_count": underconfidence, "primary_flag": primary, "summary_insight": f"Practice score: {session.self_reported_accuracy:.1f}%; novel variant score: {accuracy:.1f}% (Gap: {gap:+.1f}%).", "question_results": results}
    session.app_variant_accuracy, session.practice_assessment_gap, session.behavioral_flags = accuracy, gap, flags
    node = await db_session.scalar(select(SyllabusNode).where(SyllabusNode.id == session.node_id))
    if node:
        if accuracy >= 80 and gap <= 10:
            node.status = NodeStatus.MASTERED
        elif gap > 20 or accuracy < 60:
            node.status = NodeStatus.REVISION_CUE
    user = await db_session.scalar(select(User).where(User.id == session.user_id))
    if user:
        profile = dict(user.jsonb_profile or {})
        history = list(profile.get("calibration_history", []))[-49:]
        history.append({"session_id": str(session.id), "node_id": str(session.node_id), "app_accuracy": accuracy, "gap_score": gap, "primary_flag": primary})
        profile["calibration_history"] = history
        profile["calibration_metrics"] = {"latest_app_accuracy": accuracy, "latest_gap_score": gap, "sessions_evaluated": len(history)}
        user.jsonb_profile = profile
    await db_session.flush()
    return {"session_id": str(session.id), "app_variant_accuracy": accuracy, "practice_assessment_gap": gap, **flags}
