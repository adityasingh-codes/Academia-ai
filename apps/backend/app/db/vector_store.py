import logging
from pathlib import Path
from typing import Any

import chromadb

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """Persistent ChromaDB adapter for document chunk storage and retrieval."""

    def __init__(self, persist_directory: str | None = None) -> None:
        directory = Path(persist_directory or get_settings().CHROMA_PERSIST_DIRECTORY).resolve()
        directory.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(directory))

    def get_or_create_collection(self, collection_name: str):
        if not collection_name.strip():
            raise ValueError("collection_name must not be empty")
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_chunks(self, collection_name: str, ids: list[str], documents: list[str], metadatas: list[dict[str, Any]], embeddings: list[list[float]]) -> None:
        if not ids:
            return
        if len({len(ids), len(documents), len(metadatas), len(embeddings)}) != 1:
            raise ValueError("Chunk ids, documents, metadata, and embeddings must have equal lengths")
        if any(not chunk_id or not document for chunk_id, document in zip(ids, documents)):
            raise ValueError("Chunk ids and documents must not be empty")
        try:
            self.get_or_create_collection(collection_name).upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings,
            )
        except Exception:
            logger.exception("Failed to upsert %d chunks into %s", len(ids), collection_name)
            raise

    def query_similar(self, collection_name: str, query_embedding: list[float], top_k: int = 5, where: dict[str, Any] | None = None) -> dict[str, Any]:
        if top_k < 1:
            raise ValueError("top_k must be positive")
        if not query_embedding:
            raise ValueError("query_embedding must not be empty")
        collection = self.get_or_create_collection(collection_name)
        available = collection.count()
        if not available:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
        return collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, available),
            where=where,
            include=["documents", "metadatas", "distances"],
        )

    def get_chunks(self, collection_name: str, where: dict[str, Any], limit: int = 100) -> dict[str, Any]:
        return self.get_or_create_collection(collection_name).get(where=where, limit=limit, include=["documents", "metadatas"])
