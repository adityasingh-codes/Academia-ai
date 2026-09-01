from pydantic import BaseModel


class RootCauseDiagnostic(BaseModel):
    target_node_id: str
    target_node_title: str
    target_mastery: float
    root_cause_node_id: str | None = None
    root_cause_title: str | None = None
    root_cause_mastery: float | None = None
    dependency_chain: list[str]
    diagnostic_message: str
