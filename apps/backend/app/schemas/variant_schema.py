from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VariantQuestion(StrictModel):
    question_number: int
    difficulty_tier: Literal["EASY", "EASY_MEDIUM", "MEDIUM", "MEDIUM_HARD", "HARD"]
    technique_used: Literal["PARAMETER_CHANGE", "APPROACH_REVERSAL", "SOLUTION_EXPANSION", "SURFACE_REPHRASING", "ALTERNATE_METHOD"]
    question_text: str
    question_type: Literal["MULTIPLE_CHOICE", "NUMERICAL_INPUT", "STEP_BY_STEP_TEXT"]
    options: list[str] | None
    correct_answer: str
    detailed_step_by_step_solution: str
    concept_tested: str

    @model_validator(mode="after")
    def validate_options(self):
        if self.question_type == "MULTIPLE_CHOICE" and (not self.options or len(self.options) != 4):
            raise ValueError("Multiple-choice questions require exactly four options")
        if self.question_type != "MULTIPLE_CHOICE" and self.options:
            raise ValueError("Only multiple-choice questions may have options")
        return self


class VariantBatchResponse(StrictModel):
    total_generated: int
    target_node_id: str
    variants: list[VariantQuestion]
