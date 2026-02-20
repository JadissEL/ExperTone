"""
FastAPI ML microservice for expert ranking and rate prediction.
"""

import re
from typing import Any

from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from loguru import logger
from pydantic import BaseModel, Field

from database import fetch_experts_for_project, fetch_project, fetch_semantic_similarities
from embeddings import get_embedding
from graph_engine import GraphEngine
from rate_estimator import (
    predict_rate as rate_estimator_predict,
)
from rate_estimator import (
    train_and_save as rate_estimator_train,
)
from scoring import ExpertRanker, run_xgboost_ranker

load_dotenv()

app = FastAPI(title="ExperTone ML Service", version="1.0.0")


# ============== Request/Response Models ==============


class RankRequest(BaseModel):
    project_id: str


class RankResponse(BaseModel):
    project_id: str
    ranked_experts: list[dict[str, Any]]


class PredictRateRequest(BaseModel):
    text: str  # LinkedIn/CV text


class PredictRateResponse(BaseModel):
    predicted_rate: float
    confidence: float
    reasoning: str


class GraphVisualizeRequest(BaseModel):
    limit: int = Field(default=500, ge=1, le=2000)


class EmbeddingRequest(BaseModel):
    text: str


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dimensions: int = 1536


class SuggestedRateRequest(BaseModel):
    seniority_score: int = Field(default=50, ge=0, le=100)
    years_experience: int = Field(default=5, ge=0, le=50)
    country: str = Field(default="", max_length=100)
    region: str = Field(default="", max_length=100)
    industry: str = Field(default="Other", max_length=200)


# ============== Endpoints ==============


@app.post("/embeddings", response_model=EmbeddingResponse)
def create_embedding(req: EmbeddingRequest) -> EmbeddingResponse:
    """
    Generate 1536-dim embedding for search intent / brief.
    Used by Next.js to pre-process search before n8n scrape.
    """
    text = (req.text or "").strip()[:2000]
    if not text:
        logger.warning("Embedding request with empty text")
        raise HTTPException(status_code=400, detail="Text required")
    emb = get_embedding(text)
    return EmbeddingResponse(embedding=emb, dimensions=len(emb))


@app.post("/rank", response_model=RankResponse)
def rank_experts(req: RankRequest) -> RankResponse:
    """
    Rank experts for a project.
    1. Fetches project filters and potential experts
    2. Computes semantic similarity + composite scores
    3. Re-ranks with XGBoost
    4. Returns ranked list with Confidence Score and Reasoning
    """
    project = fetch_project(req.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    filters = project.get("filter_criteria") or {}
    experts = fetch_experts_for_project(filters, limit=100)

    if not experts:
        return RankResponse(
            project_id=req.project_id,
            ranked_experts=[],
        )

    # Build query text for semantic embedding
    query_parts = [
        filters.get("industry", ""),
        filters.get("sub_industry", ""),
        filters.get("region", ""),
        filters.get("brief", filters.get("query", "")),
    ]
    query_text = " ".join(str(p) for p in query_parts if p).strip() or project.get("title", "")

    # Get semantic similarities (optional - may fail if no embeddings API)
    semantic_map: dict[str, float] = {}
    try:
        embedding = get_embedding(query_text)
        expert_ids = [e["id"] for e in experts]
        semantic_map = fetch_semantic_similarities(expert_ids, embedding, limit=len(expert_ids))
    except Exception as exc:
        logger.warning("Semantic similarity fallback: {}", exc)
        semantic_map = {e["id"]: 0.5 for e in experts}

    # Build graph for Network Influence Score (optional; may fail if graph columns missing)
    graph_engine = None
    try:
        graph_engine = GraphEngine()
        graph_engine.build_knowledge_graph(limit=500)
    except Exception as exc:
        logger.debug("Graph engine unavailable: {}", exc)

    # Score and rank
    ranker = ExpertRanker(filters, graph_engine=graph_engine)
    scored = ranker.rank_experts(experts, semantic_map)
    ranked = run_xgboost_ranker(scored)

    # Format response
    return RankResponse(
        project_id=req.project_id,
        ranked_experts=[
            {
                "expert_id": e["id"],
                "name": e["name"],
                "industry": e["industry"],
                "confidence_score": e["confidence_score"],
                "reasoning": e["reasoning"],
            }
            for e in ranked
        ],
    )


@app.post("/predict-rate", response_model=PredictRateResponse)
def predict_rate(req: PredictRateRequest) -> PredictRateResponse:
    """
    Predict 60-min rate from LinkedIn/CV text.
    Uses seniority keywords and geography heuristics.
    """
    text = (req.text or "").lower()
    if len(text) < 20:
        raise HTTPException(status_code=400, detail="Text too short for prediction")

    # Extract years of experience
    years_match = re.search(
        r"(\d+)\s*(?:years?|yrs?|y\.?)\s*(?:of\s+)?(?:experience|exp\.?)", text, re.I
    )
    years = int(years_match.group(1)) if years_match else 5

    # Seniority keywords
    seniority = 50
    if any(w in text for w in ["c-level", "ceo", "cto", "cfo", "chief", "vp", "vice president"]):
        seniority = 90
    elif any(w in text for w in ["director", "head of", "senior director"]):
        seniority = 75
    elif any(w in text for w in ["senior", "lead", "principal", "manager"]):
        seniority = 65
    elif any(w in text for w in ["junior", "associate", "analyst"]):
        seniority = 35

    # Geography multiplier (rough)
    geo_mult = 1.0
    if any(
        w in text for w in ["usa", "united states", "san francisco", "new york", "london", "uk"]
    ):
        geo_mult = 1.2
    elif any(w in text for w in ["india", "pakistan", "philippines"]):
        geo_mult = 0.6

    # Base rate formula
    base = 100 + (years * 15) + (seniority * 0.8)
    rate = base * geo_mult
    rate = max(80, min(600, rate))

    confidence = 0.7 if years_match else 0.5
    reasoning = f"Based on {years} years experience, seniority level, and geography indicators."

    return PredictRateResponse(
        predicted_rate=round(rate, 2),
        confidence=confidence,
        reasoning=reasoning,
    )


@app.post("/graph/visualize")
def graph_visualize(
    req: GraphVisualizeRequest = Body(default_factory=GraphVisualizeRequest),  # noqa: B008
) -> dict[str, Any]:
    """
    Build knowledge graph and return JSON for react-force-graph 3D.
    Nodes: id, label, group, val (size from centrality), community
    Links: source, target, type (ALUMNI, HAS_SKILL, SHARED_EMPLOYER, SAME_SUBINDUSTRY)
    """
    opts = req or GraphVisualizeRequest()
    engine = GraphEngine()
    engine.build_knowledge_graph(limit=opts.limit)
    return engine.to_react_force_graph_format()


@app.post("/insights/graph")
def insights_graph(
    req: GraphVisualizeRequest = Body(default_factory=GraphVisualizeRequest),  # noqa: B008
) -> dict[str, Any]:
    """
    Expert relationship graph: experts + companies/industries as nodes;
    edges = shared employer, same sub-industry. Louvain clusters for 'Industry Influence Hubs'.
    Same output format as /graph/visualize for D3/React-Force-Graph.
    """
    opts = req or GraphVisualizeRequest()
    engine = GraphEngine()
    engine.build_knowledge_graph(limit=opts.limit)
    return engine.to_react_force_graph_format()


@app.post("/insights/suggested-rate")
def suggested_rate(req: SuggestedRateRequest) -> dict[str, Any]:
    """
    Smart Rate Estimator: returns suggested market rate range (min/max) and point estimate.
    Used for 'Fair Market Value' on Expert Profile; updates when seniority/company/geo change.
    """
    out = rate_estimator_predict(
        seniority_score=req.seniority_score,
        years_experience=req.years_experience,
        country=req.country or "",
        region=req.region or "",
        industry=req.industry or "Other",
    )
    return out


@app.post("/insights/train-rate-model")
def train_rate_model(body: dict[str, Any] | None = Body(None)) -> dict[str, Any]:  # noqa: B008
    """Train the rate estimator. If body has use_engagements=True (e.g. from optimize_iq), train on engagement actual_cost."""
    use_engagements = isinstance(body, dict) and body.get("use_engagements") is True
    result = rate_estimator_train(use_engagements=use_engagements)
    return result


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app, host="0.0.0.0", port=8000
    )  # nosec B104 - bind all interfaces for container deployment
