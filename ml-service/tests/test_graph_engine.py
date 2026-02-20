"""Tests for GraphEngine."""

from typing import Any
from unittest.mock import patch

import pytest

# Import after patching database to avoid DB connection at import
from graph_engine import (
    NODE_GROUP_COMPANY,
    NODE_GROUP_EXPERT,
    NODE_GROUP_INDUSTRY,
    NODE_GROUP_SKILL,
    GraphEngine,
)


@pytest.fixture
def mock_experts() -> list[dict[str, Any]]:
    return [
        {
            "id": "exp1",
            "name": "Jane Smith",
            "industry": "Finance",
            "sub_industry": "M&A",
            "past_employers": ["Goldman Sachs", "McKinsey"],
            "skills": ["M&A", "Strategy"],
        },
        {
            "id": "exp2",
            "name": "John Doe",
            "industry": "Consulting",
            "sub_industry": "",
            "past_employers": ["Goldman Sachs"],
            "skills": [],
        },
    ]


@patch("graph_engine.fetch_experts_for_graph")
def test_build_knowledge_graph_creates_nodes_and_edges(
    mock_fetch: Any, mock_experts: list[dict[str, Any]]
) -> None:
    mock_fetch.return_value = mock_experts

    engine = GraphEngine()
    engine.build_knowledge_graph(limit=10)

    out = engine.to_react_force_graph_format()

    # 2 experts + 2 companies (Goldman Sachs, McKinsey) + 2 skills (M&A, Strategy)
    assert len(out["nodes"]) >= 4
    assert len(out["links"]) >= 3

    node_ids = {n["id"] for n in out["nodes"]}
    assert "expert_exp1" in node_ids
    assert "expert_exp2" in node_ids
    assert "company_Goldman_Sachs" in node_ids
    assert "company_McKinsey" in node_ids

    for node in out["nodes"]:
        assert "id" in node
        assert "label" in node
        assert "group" in node
        assert node["group"] in (
            NODE_GROUP_EXPERT,
            NODE_GROUP_COMPANY,
            NODE_GROUP_SKILL,
            NODE_GROUP_INDUSTRY,
        )
        assert "val" in node
        assert "community" in node

    for link in out["links"]:
        assert "source" in link
        assert "target" in link
        assert link["type"] in ("ALUMNI", "HAS_SKILL")


@patch("graph_engine.fetch_experts_for_graph")
def test_empty_experts_returns_empty_graph(mock_fetch: Any) -> None:
    mock_fetch.return_value = []

    engine = GraphEngine()
    engine.build_knowledge_graph(limit=10)

    out = engine.to_react_force_graph_format()
    assert out["nodes"] == []
    assert out["links"] == []


@patch("graph_engine.fetch_experts_for_graph")
def test_get_network_influence_unknown_expert_returns_zero(mock_fetch: Any) -> None:
    mock_fetch.return_value = []

    engine = GraphEngine()
    engine.build_knowledge_graph(limit=10)

    assert engine.get_network_influence("unknown_id") == 0.0


@patch("graph_engine.fetch_experts_for_graph")
def test_get_network_influence_known_expert(
    mock_fetch: Any, mock_experts: list[dict[str, Any]]
) -> None:
    mock_fetch.return_value = mock_experts

    engine = GraphEngine()
    engine.build_knowledge_graph(limit=10)

    # exp1 has more connections (2 companies, 2 skills) than exp2
    score = engine.get_network_influence("exp1")
    assert 0 <= score <= 1.0
