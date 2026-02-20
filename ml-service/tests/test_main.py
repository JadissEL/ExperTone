"""Tests for FastAPI endpoints."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client() -> TestClient:
    from main import app

    return TestClient(app)


def test_health(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_predict_rate_success(client: TestClient) -> None:
    r = client.post(
        "/predict-rate",
        json={
            "text": "Senior Director at McKinsey with 15 years of experience in M&A. Based in New York."
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "predicted_rate" in data
    assert "confidence" in data
    assert "reasoning" in data
    assert 80 <= data["predicted_rate"] <= 600


def test_predict_rate_too_short(client: TestClient) -> None:
    r = client.post("/predict-rate", json={"text": "short"})
    assert r.status_code == 400


def test_rank_project_not_found(client: TestClient) -> None:
    with patch("main.fetch_project", return_value=None):
        r = client.post("/rank", json={"project_id": "nonexistent"})
        assert r.status_code == 404


def test_graph_visualize(client: TestClient) -> None:
    r = client.post("/graph/visualize", json={"limit": 50})
    assert r.status_code == 200
    data = r.json()
    assert "nodes" in data
    assert "links" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["links"], list)


def test_graph_visualize_empty_body(client: TestClient) -> None:
    r = client.post("/graph/visualize", json={})
    assert r.status_code == 200
