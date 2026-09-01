from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import ConfidenceRating, NodeStatus, NodeType


class Schema(BaseModel): model_config = ConfigDict(from_attributes=True)
class UserCreate(BaseModel): email: EmailStr; password: str = Field(min_length=8, max_length=128)
class UserLogin(UserCreate): pass
class Token(BaseModel): access_token: str; token_type: str = "bearer"
class UserResponse(Schema): id: UUID; email: EmailStr; streak_counter: int; created_at: datetime; jsonb_profile: dict[str, Any]
class SubjectCreate(BaseModel): title: str = Field(min_length=1, max_length=255)
class SubjectResponse(Schema): id: UUID; user_id: UUID; title: str; full_pdf_url: str | None; overall_mastery_pct: float; created_at: datetime
class NodeCreate(BaseModel):
    subject_id: UUID; parent_id: UUID | None = None; title: str = Field(min_length=1, max_length=255); node_type: NodeType; status: NodeStatus = NodeStatus.PENDING; position_order: int = Field(ge=0); prerequisite_ids: list[str] | None = None; vector_embedding_id: str | None = None
class NodeUpdate(BaseModel):
    parent_id: UUID | None = None; title: str | None = Field(default=None, min_length=1, max_length=255); status: NodeStatus | None = None; position_order: int | None = Field(default=None, ge=0); prerequisite_ids: list[str] | None = None; vector_embedding_id: str | None = None
class NodeResponse(Schema):
    id: UUID; subject_id: UUID; parent_id: UUID | None; title: str; node_type: NodeType; status: NodeStatus; position_order: int; prerequisite_ids: list[str] | None; vector_embedding_id: str | None
class SessionLogCreate(BaseModel):
    node_id: UUID; session_date: date; total_questions_attempted: int = Field(ge=0); difficulty_split: dict[str, int] = Field(default_factory=dict); self_reported_accuracy: float = Field(ge=0, le=100); app_variant_accuracy: float = Field(default=0, ge=0, le=100); confidence_rating: ConfidenceRating; behavioral_flags: dict[str, Any] = Field(default_factory=dict); uploaded_solution_urls: list[str] | None = None; study_duration_minutes: int = Field(default=0, ge=0)
class SessionLogResponse(Schema):
    id: UUID; user_id: UUID; node_id: UUID; session_date: date; total_questions_attempted: int; difficulty_split: dict[str, int]; self_reported_accuracy: float; app_variant_accuracy: float; practice_assessment_gap: float; confidence_rating: ConfidenceRating; behavioral_flags: dict[str, Any]; uploaded_solution_urls: list[str] | None; study_duration_minutes: int
class BoundaryCheckRequest(BaseModel): question: str = Field(min_length=1, max_length=20_000)
