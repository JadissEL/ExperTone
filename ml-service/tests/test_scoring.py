"""Tests for ExpertRanker and run_xgboost_ranker."""

from scoring import ExpertRanker, run_xgboost_ranker


def test_expert_ranker_without_graph_engine() -> None:
    ranker = ExpertRanker({"industry": "Finance"})
    expert = {
        "id": "e1",
        "name": "Jane",
        "industry": "Finance",
        "sub_industry": "M&A",
        "seniority_score": 70,
        "years_experience": 10,
        "predicted_rate": 250,
    }
    score, reasoning = ranker.compute_composite_score(expert, semantic_similarity=0.8)
    assert 0 <= score <= 1.0
    assert "reasoning" in reasoning.lower() or "match" in reasoning.lower()


def test_expert_ranker_industry_match() -> None:
    ranker = ExpertRanker({"industry": "Finance", "sub_industry": "M&A"})
    expert = {
        "id": "e1",
        "industry": "Finance",
        "sub_industry": "M&A",
        "seniority_score": 50,
        "predicted_rate": 200,
    }
    score, _ = ranker.compute_composite_score(expert, semantic_similarity=1.0)
    assert score > 0.5


def test_expert_ranker_rank_experts() -> None:
    ranker = ExpertRanker({})
    experts = [
        {"id": "e1", "seniority_score": 80, "industry": "", "predicted_rate": 300},
        {"id": "e2", "seniority_score": 40, "industry": "", "predicted_rate": 150},
    ]
    semantic_map = {"e1": 0.9, "e2": 0.5}
    ranked = ranker.rank_experts(experts, semantic_map)
    assert len(ranked) == 2
    assert ranked[0]["confidence_score"] >= ranked[1]["confidence_score"]


def test_run_xgboost_ranker_empty() -> None:
    assert run_xgboost_ranker([]) == []


def test_run_xgboost_ranker_single() -> None:
    experts = [{"id": "e1", "seniority_score": 50, "years_experience": 5, "predicted_rate": 200}]
    result = run_xgboost_ranker(experts)
    assert len(result) == 1
    assert "confidence_score" in result[0]


def test_run_xgboost_ranker_multiple() -> None:
    experts = [
        {
            "id": "e1",
            "seniority_score": 70,
            "years_experience": 10,
            "predicted_rate": 300,
            "confidence_score": 0.8,
            "semantic_similarity": 0.9,
        },
        {
            "id": "e2",
            "seniority_score": 50,
            "years_experience": 5,
            "predicted_rate": 200,
            "confidence_score": 0.6,
            "semantic_similarity": 0.7,
        },
    ]
    result = run_xgboost_ranker(experts)
    assert len(result) == 2
    assert result[0]["confidence_score"] >= result[1]["confidence_score"]
