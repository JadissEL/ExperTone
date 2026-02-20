"""
Database connector for Neon PostgreSQL.
Uses connection pooling for efficient reuse.
"""

import os
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

from dotenv import load_dotenv
from psycopg2 import pool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in .env")

# Connection pool: min 1, max 10 connections
_connection_pool: pool.ThreadedConnectionPool | None = None


def get_pool() -> pool.ThreadedConnectionPool:
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL,
        )
    return _connection_pool


@contextmanager
def get_connection() -> Generator[Any, None, None]:
    """Yield a connection from the pool. Auto-returns on exit."""
    conn = get_pool().getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        get_pool().putconn(conn)


def fetch_project(project_id: str) -> dict[str, Any] | None:
    """Fetch a research project by ID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, creator_id, title, status, filter_criteria, deadline
                FROM research_projects WHERE id = %s
                """,
                (project_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "creator_id": row[1],
                "title": row[2],
                "status": row[3],
                "filter_criteria": row[4],
                "deadline": row[5],
            }


def fetch_experts_for_project(
    filter_criteria: dict[str, Any] | None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """
    Fetch experts matching project filter criteria.
    If filter_criteria is empty/None, returns GLOBAL_POOL experts.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            filters = filter_criteria or {}
            industry = filters.get("industry")
            sub_industry = filters.get("sub_industry")
            region = filters.get("region")
            country = filters.get("country")

            query = """
                SELECT e.id, e.name, e.industry, e.sub_industry, e.country, e.region,
                       e.seniority_score, e.years_experience, e.predicted_rate
                FROM experts e
                WHERE e.visibility_status = 'GLOBAL_POOL'
            """
            params: list[Any] = []

            if industry:
                query += " AND e.industry ILIKE %s"
                params.append(f"%{industry}%")
            if sub_industry:
                query += " AND e.sub_industry ILIKE %s"
                params.append(f"%{sub_industry}%")
            if region:
                query += " AND e.region ILIKE %s"
                params.append(f"%{region}%")
            if country:
                query += " AND e.country ILIKE %s"
                params.append(f"%{country}%")

            query += " ORDER BY e.created_at DESC LIMIT %s"
            params.append(limit)

            cur.execute(query, params)
            rows = cur.fetchall()

            return [
                {
                    "id": r[0],
                    "name": r[1],
                    "industry": r[2],
                    "sub_industry": r[3],
                    "country": r[4],
                    "region": r[5],
                    "seniority_score": r[6],
                    "years_experience": r[7],
                    "predicted_rate": float(r[8]),
                }
                for r in rows
            ]


def fetch_experts_for_graph(limit: int = 500) -> list[dict[str, Any]]:
    """
    Fetch all experts with past_employers and skills for graph building.
    past_employers: JSON array of company names, e.g. ["Goldman Sachs", "McKinsey"]
    skills: JSON array of skill strings, e.g. ["M&A", "Strategy"]
    Returns [] if columns are missing (migration not applied).
    """
    import json

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, industry, sub_industry, past_employers, skills
                    FROM experts
                    WHERE visibility_status = 'GLOBAL_POOL'
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
                rows = cur.fetchall()

            result = []
            for r in rows:
                past = r[4]
                skills = r[5]
                if isinstance(past, str):
                    try:
                        past = json.loads(past) if past else []
                    except Exception:
                        past = []
                if isinstance(skills, str):
                    try:
                        skills = json.loads(skills) if skills else []
                    except Exception:
                        skills = []
                if past is None:
                    past = []
                if skills is None:
                    skills = []
                result.append(
                    {
                        "id": r[0],
                        "name": r[1],
                        "industry": r[2],
                        "sub_industry": r[3],
                        "past_employers": past if isinstance(past, list) else [],
                        "skills": skills if isinstance(skills, list) else [],
                    }
                )
            return result
    except Exception:
        return []


def fetch_semantic_similarities(
    expert_ids: list[str],
    query_embedding: list[float],
    limit: int = 50,
) -> dict[str, float]:
    """
    Get cosine similarity (1 - distance) for experts against a query embedding.
    Returns dict of expert_id -> similarity score.
    """
    if not expert_ids or not query_embedding:
        return {}

    vector_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
    ids_placeholder = ",".join(["%s"] * len(expert_ids))

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(  # nosec B608
                f"""
                SELECT expert_id, 1 - (embedding <=> %s::vector) AS similarity
                FROM expert_vectors
                WHERE expert_id IN ({ids_placeholder})
                ORDER BY similarity DESC
                LIMIT %s
                """,
                [vector_str] + expert_ids + [limit],
            )
            return {row[0]: float(row[1]) for row in cur.fetchall()}
