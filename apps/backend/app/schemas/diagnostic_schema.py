from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FlashcardCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    front: str = Field(min_length=1)
    back: str = Field(min_length=1)


class QuizCandidateSeed(BaseModel):
    model_config = ConfigDict(extra="forbid")

    concept_tested: str = Field(min_length=1)
    difficulty: str = Field(min_length=1)


class ConceptNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    node_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    level: Literal["Chapter", "Topic", "Subtopic"]
    parent_id: str | None = None
    summary: str = Field(min_length=1)
    page_references: list[int] = Field(default_factory=list)
    blooms_taxonomy_level: Literal["Remember", "Understand", "Apply", "Analyze"]
    flashcard_candidates: list[FlashcardCandidate] = Field(default_factory=list)
    quiz_candidate_seeds: list[QuizCandidateSeed] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_subtopic_candidates(self) -> "ConceptNode":
        if self.level == "Subtopic":
            if len(self.flashcard_candidates) < 2:
                raise ValueError("Subtopics require at least two flashcard candidates")
            if not self.quiz_candidate_seeds:
                raise ValueError("Subtopics require at least one quiz candidate seed")
        return self


class DependencyLink(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_node_id: str = Field(min_length=1)
    target_node_id: str = Field(min_length=1)
    relationship_type: Literal["STRICT_PREREQUISITE", "RECOMMENDED_BEFORE", "EXPANDS_UPON"]
    reasoning: str = Field(min_length=1)


class KnowledgeGraphPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: str = Field(min_length=1)
    domain_detected: str = Field(min_length=1)
    nodes: list[ConceptNode]
    links: list[DependencyLink]

    @model_validator(mode="after")
    def validate_graph_references(self) -> "KnowledgeGraphPayload":
        node_ids = [node.node_id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Knowledge graph node_id values must be unique")
        known_ids = set(node_ids)
        for node in self.nodes:
            if node.parent_id and node.parent_id not in known_ids:
                raise ValueError(f"Unknown parent node: {node.parent_id}")
        for link in self.links:
            if link.source_node_id not in known_ids or link.target_node_id not in known_ids:
                raise ValueError("Dependency links must reference known nodes")
            if link.source_node_id == link.target_node_id:
                raise ValueError("Dependency links cannot point to the same node")
        return self


class RootCauseDiagnostic(BaseModel):
    target_node_id: str
    target_node_title: str
    target_mastery: float
    root_cause_node_id: str | None = None
    root_cause_title: str | None = None
    root_cause_mastery: float | None = None
    dependency_chain: list[str]
    diagnostic_message: str
