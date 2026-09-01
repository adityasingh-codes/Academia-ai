from collections import deque
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import NodeStatus, SessionLog, SyllabusNode


async def fetch_prerequisite_graph(db_session: AsyncSession, target_node_id: UUID, max_depth: int = 4) -> dict[str, Any]:
    """Build a bounded, cycle-safe prerequisite DAG for one syllabus node."""
    target = await db_session.scalar(select(SyllabusNode).where(SyllabusNode.id == target_node_id))
    if not target:
        raise ValueError("Target syllabus node not found")
    nodes, edges, queue, visited = {str(target.id): target}, {}, deque([(target, 0)]), {target.id}
    while queue:
        node, depth = queue.popleft()
        if depth >= max_depth:
            continue
        raw_ids = node.prerequisite_ids or []
        ids = []
        labels = []
        for value in raw_ids:
            try: ids.append(UUID(str(value)))
            except ValueError: labels.append(str(value))
        conditions = ([SyllabusNode.id.in_(ids)] if ids else []) + ([func.lower(SyllabusNode.title).in_([label.lower() for label in labels])] if labels else [])
        prerequisites = (await db_session.scalars(select(SyllabusNode).where(SyllabusNode.subject_id == target.subject_id, or_(*conditions)))).all() if conditions else []
        edges[str(node.id)] = [str(item.id) for item in prerequisites]
        for item in prerequisites:
            nodes[str(item.id)] = item
            if item.id not in visited:
                visited.add(item.id)
                queue.append((item, depth + 1))
    return {"target_id": str(target.id), "nodes": nodes, "edges": edges}


async def _mastery(db_session: AsyncSession, user_id: UUID, node: SyllabusNode) -> float:
    accuracy = await db_session.scalar(select(func.avg(SessionLog.app_variant_accuracy)).where(SessionLog.user_id == user_id, SessionLog.node_id == node.id, SessionLog.app_variant_accuracy.is_not(None)))
    return round(float(accuracy if accuracy is not None else node.status == NodeStatus.MASTERED and 100 or 0), 2)


def _chain(target_id: str, root_id: str, nodes: dict[str, SyllabusNode], edges: dict[str, list[str]]) -> list[str]:
    queue, seen = deque([(target_id, [target_id])]), {target_id}
    while queue:
        current, path = queue.popleft()
        if current == root_id:
            return [nodes[node_id].title for node_id in path]
        for parent in edges.get(current, []):
            if parent not in seen:
                seen.add(parent)
                queue.append((parent, path + [parent]))
    return [nodes[target_id].title]


async def flag_root_cause_for_revision(db_session: AsyncSession, root_cause_node_id: UUID) -> None:
    """Surface a confirmed root cause in the learner's revision roadmap."""
    await db_session.execute(update(SyllabusNode).where(SyllabusNode.id == root_cause_node_id).values(status=NodeStatus.REVISION_CUE))


async def trace_root_cause(db_session: AsyncSession, user_id: UUID, target_node_id: UUID) -> dict[str, Any]:
    """Find and flag the deepest weak prerequisite behind a target node."""
    graph = await fetch_prerequisite_graph(db_session, target_node_id)
    nodes, edges, target_id = graph["nodes"], graph["edges"], graph["target_id"]
    target = nodes[target_id]
    mastery = {node_id: await _mastery(db_session, user_id, node) for node_id, node in nodes.items()}
    depths, queue = {target_id: 0}, deque([target_id])
    while queue:
        node_id = queue.popleft()
        for parent_id in edges.get(node_id, []):
            if parent_id not in depths:
                depths[parent_id] = depths[node_id] + 1
                queue.append(parent_id)
    candidates = [node_id for node_id in nodes if node_id != target_id and (mastery[node_id] < 65 or nodes[node_id].status == NodeStatus.REVISION_CUE)]
    if not candidates:
        return {"target_node_id": target_id, "target_node_title": target.title, "target_mastery": mastery[target_id], "dependency_chain": [target.title], "diagnostic_message": "No weak prerequisite was identified within the configured dependency depth."}
    root_id = min(candidates, key=lambda node_id: (mastery[node_id], -depths.get(node_id, 0)))
    root = nodes[root_id]
    await flag_root_cause_for_revision(db_session, root.id)
    chain = _chain(target_id, root_id, nodes, edges)
    return {"target_node_id": target_id, "target_node_title": target.title, "target_mastery": mastery[target_id], "root_cause_node_id": root_id, "root_cause_title": root.title, "root_cause_mastery": mastery[root_id], "dependency_chain": chain, "diagnostic_message": f"Your {target.title} difficulty originates from a {root.title} gap (Mastery: {mastery[root_id]:.1f}%). Fix {root.title} first to unlock this topic."}
