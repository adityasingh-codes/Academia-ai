from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import ConfidenceRating


class SubmittedAnswer(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    question_id: UUID = Field(alias="questionId")
    student_answer: str = Field(alias="studentAnswer", max_length=20_000)
    confidence_rating: ConfidenceRating = Field(alias="confidenceRating")
    time_spent_seconds: int = Field(default=0, alias="timeSpentSeconds", ge=0)


class AssessmentSubmission(BaseModel):
    answers: list[SubmittedAnswer] = Field(min_length=1)
