"""
Generate 1536-dim embeddings for semantic similarity.
Uses OpenAI API (or xAI if base URL set) to match pgvector schema.
"""

import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Support both OpenAI and xAI (Grok)
_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("XAI_API_KEY")
_base_url = "https://api.x.ai/v1" if os.getenv("XAI_API_KEY") else None

_client = OpenAI(api_key=_api_key, base_url=_base_url) if _api_key else None
EMBEDDING_DIM = 1536


def get_embedding(text: str) -> list[float]:
    """Generate 1536-dim embedding for text. Requires OPENAI_API_KEY or XAI_API_KEY."""
    if not _client:
        raise ValueError("Set OPENAI_API_KEY or XAI_API_KEY in .env for embeddings")
    r = _client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        dimensions=EMBEDDING_DIM,
    )
    emb = r.data[0].embedding
    if len(emb) != EMBEDDING_DIM:
        raise ValueError(f"Expected {EMBEDDING_DIM} dims, got {len(emb)}")
    return emb
