"""
Generate 1536-dim embeddings for semantic similarity.
Supports OpenRouter, OpenAI, or xAI (Grok). Set EMBEDDING_PROVIDER=openrouter|openai|xai.
"""

import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

_provider = (os.getenv("EMBEDDING_PROVIDER") or "openai").lower()
_use_openrouter = _provider == "openrouter"
_api_key = (
    os.getenv("OPENROUTER_API_KEY")
    if _use_openrouter
    else (os.getenv("OPENAI_API_KEY") or os.getenv("XAI_API_KEY"))
)
_base_url = (
    "https://openrouter.ai/api/v1"
    if _use_openrouter
    else ("https://api.x.ai/v1" if os.getenv("XAI_API_KEY") else None)
)
_embedding_model = (
    "openai/text-embedding-3-small"
    if _use_openrouter
    else "text-embedding-3-small"
)

_client = OpenAI(api_key=_api_key, base_url=_base_url) if _api_key else None
EMBEDDING_DIM = 1536


def get_embedding(text: str) -> list[float]:
    """Generate 1536-dim embedding. Requires OPENROUTER_API_KEY, OPENAI_API_KEY, or XAI_API_KEY."""
    if not _client:
        raise ValueError(
            "Set EMBEDDING_PROVIDER=openrouter + OPENROUTER_API_KEY, or OPENAI_API_KEY, or XAI_API_KEY"
        )
    r = _client.embeddings.create(
        model=_embedding_model,
        input=text,
        dimensions=EMBEDDING_DIM,
    )
    emb = r.data[0].embedding
    if len(emb) != EMBEDDING_DIM:
        raise ValueError(f"Expected {EMBEDDING_DIM} dims, got {len(emb)}")
    return emb
