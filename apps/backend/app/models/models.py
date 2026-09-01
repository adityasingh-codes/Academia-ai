from datetime import date, datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase): pass


class NodeType(str, Enum): CHAPTER = "CHAPTER"; TOPIC = "TOPIC"; SUBTOPIC = "SUBTOPIC"
class NodeStatus(str, Enum): MASTERED = "MASTERED"; ACTIVE = "ACTIVE"; REVISION_CUE = "REVISION_CUE"; PENDING = "PENDING"
class ConfidenceRating(str, Enum): GUESSING = "GUESSING"; SOMEWHAT_CONFIDENT = "SOMEWHAT_CONFIDENT"; CONFIDENT = "CONFIDENT"; VERY_CONFIDENT = "VERY_CONFIDENT"
class MistakeTaxonomy(str, Enum): NONE = "NONE"; CONCEPTUAL = "CONCEPTUAL"; PROCEDURAL = "PROCEDURAL"; CALCULATION = "CALCULATION"; NOVEL_TRANSFER = "NOVEL_TRANSFER"


class User(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    streak_counter: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    jsonb_profile: Mapped[dict[str, Any]] = mapped_column(JSONB, default=lambda: {"strengths": [], "weaknesses": [], "optimal_session_length": 0, "decay_rates": {}})
    subject_spaces: Mapped[list["SubjectSpace"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    session_logs: Mapped[list["SessionLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    revision_queue: Mapped[list["RevisionQueue"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class SubjectSpace(Base):
    __tablename__ = "subject_spaces"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String)
    full_pdf_url: Mapped[str | None] = mapped_column(String, nullable=True)
    overall_mastery_pct: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user: Mapped[User] = relationship(back_populates="subject_spaces")
    syllabus_nodes: Mapped[list["SyllabusNode"]] = relationship(back_populates="subject", cascade="all, delete-orphan")


class SyllabusNode(Base):
    __tablename__ = "syllabus_nodes"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    subject_id: Mapped[UUID] = mapped_column(ForeignKey("subject_spaces.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[UUID | None] = mapped_column(ForeignKey("syllabus_nodes.id", ondelete="CASCADE"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String)
    node_type: Mapped[NodeType] = mapped_column(SQLEnum(NodeType, name="node_type"))
    status: Mapped[NodeStatus] = mapped_column(SQLEnum(NodeStatus, name="node_status"), default=NodeStatus.PENDING)
    position_order: Mapped[int] = mapped_column(Integer)
    prerequisite_ids: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    vector_embedding_id: Mapped[str | None] = mapped_column(String, nullable=True)
    subject: Mapped[SubjectSpace] = relationship(back_populates="syllabus_nodes")
    parent: Mapped["SyllabusNode | None"] = relationship(back_populates="children", remote_side=[id])
    children: Mapped[list["SyllabusNode"]] = relationship(back_populates="parent", cascade="all, delete-orphan")
    session_logs: Mapped[list["SessionLog"]] = relationship(back_populates="node")
    revision_queue: Mapped[list["RevisionQueue"]] = relationship(back_populates="node")


class SessionLog(Base):
    __tablename__ = "session_logs"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[UUID] = mapped_column(ForeignKey("syllabus_nodes.id", ondelete="CASCADE"), index=True)
    session_date: Mapped[date] = mapped_column(Date)
    total_questions_attempted: Mapped[int] = mapped_column(Integer)
    difficulty_split: Mapped[dict[str, int]] = mapped_column(JSONB)
    self_reported_accuracy: Mapped[float] = mapped_column(Float)
    app_variant_accuracy: Mapped[float] = mapped_column(Float)
    practice_assessment_gap: Mapped[float] = mapped_column(Float)
    confidence_rating: Mapped[ConfidenceRating] = mapped_column(SQLEnum(ConfidenceRating, name="confidence_rating"))
    behavioral_flags: Mapped[dict[str, Any]] = mapped_column(JSONB)
    uploaded_solution_urls: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    study_duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    user: Mapped[User] = relationship(back_populates="session_logs")
    node: Mapped[SyllabusNode] = relationship(back_populates="session_logs")
    question_variants: Mapped[list["QuestionVariantLog"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class QuestionVariantLog(Base):
    __tablename__ = "question_variant_logs"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session_logs.id", ondelete="CASCADE"), index=True)
    original_question_data: Mapped[dict[str, Any]] = mapped_column(JSONB)
    generated_variant_data: Mapped[dict[str, Any]] = mapped_column(JSONB)
    difficulty_tier: Mapped[str] = mapped_column(String)
    student_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    mistake_taxonomy: Mapped[MistakeTaxonomy] = mapped_column(SQLEnum(MistakeTaxonomy, name="mistake_taxonomy"))
    session: Mapped[SessionLog] = relationship(back_populates="question_variants")


class RevisionQueue(Base):
    __tablename__ = "revision_queues"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[UUID] = mapped_column(ForeignKey("syllabus_nodes.id", ondelete="CASCADE"), index=True)
    scheduled_date: Mapped[date] = mapped_column(Date, index=True)
    priority_score: Mapped[float] = mapped_column(Float)
    trigger_reason: Mapped[str] = mapped_column(String)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    user: Mapped[User] = relationship(back_populates="revision_queue")
    node: Mapped[SyllabusNode] = relationship(back_populates="revision_queue")
