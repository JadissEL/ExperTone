"""
Expert ranking and scoring logic.
Combines semantic similarity with weighted features and XGBoost re-ranking.
"""

from typing import TYPE_CHECKING, Any

import pandas as pd
import xgboost as xgb

if TYPE_CHECKING:
    from graph_engine import GraphEngine


class ExpertRanker:
    """
    Computes composite scores for experts against a client brief.
    Weights: Seniority 0.25, Industry 0.35, Rate 0.2, Network Influence 0.2.
    Semantic similarity is combined as a multiplier.
    """

    WEIGHT_SENIORITY = 0.25
    WEIGHT_INDUSTRY = 0.35
    WEIGHT_RATE = 0.2
    WEIGHT_NETWORK = 0.2

    def __init__(self, client_brief: dict[str, Any], graph_engine: "GraphEngine | None" = None):
        self.client_brief = client_brief or {}
        self.graph_engine = graph_engine
        self.target_industry = (self.client_brief.get("industry") or "").lower()
        self.target_sub_industry = (self.client_brief.get("sub_industry") or "").lower()
        self.target_region = (self.client_brief.get("region") or "").lower()

    def _normalize(self, value: float, min_val: float, max_val: float) -> float:
        """Normalize value to [0, 1] range."""
        if max_val <= min_val:
            return 1.0
        return max(0, min(1, (value - min_val) / (max_val - min_val)))

    def compute_composite_score(
        self,
        expert: dict[str, Any],
        semantic_similarity: float = 1.0,
    ) -> tuple[float, str]:
        """
        Compute composite score for an expert.
        Returns (score, reasoning).
        """
        # Seniority score (0-100) -> normalized
        seniority = expert.get("seniority_score", 50)
        seniority_norm = self._normalize(seniority, 0, 100)

        # Industry match: exact > partial > none
        exp_industry = (expert.get("industry") or "").lower()
        exp_sub = (expert.get("sub_industry") or "").lower()
        industry_match = 0.0
        if self.target_industry and exp_industry:
            if self.target_industry in exp_industry or exp_industry in self.target_industry:
                industry_match = 0.7
            if self.target_sub_industry and exp_sub:
                if self.target_sub_industry in exp_sub or exp_sub in self.target_sub_industry:
                    industry_match = 1.0
        if not self.target_industry:
            industry_match = 0.8  # No filter = neutral high

        # Rate predictor: prefer experts with predicted_rate in reasonable range
        # Normalize by typical range 100-500
        rate = expert.get("predicted_rate", 200)
        rate_norm = self._normalize(rate, 50, 600)

        # Network Influence Score (0-1) from graph centrality
        network_norm = 0.0
        if self.graph_engine:
            expert_id = expert.get("id")
            if expert_id is not None:
                network_norm = self.graph_engine.get_network_influence(str(expert_id))

        # Weighted composite (before semantic)
        weighted = (
            self.WEIGHT_SENIORITY * seniority_norm
            + self.WEIGHT_INDUSTRY * industry_match
            + self.WEIGHT_RATE * rate_norm
            + self.WEIGHT_NETWORK * network_norm
        )

        # Combine with semantic similarity (multiply)
        composite = weighted * max(0.1, semantic_similarity)

        # Build reasoning
        years = expert.get("years_experience", 0)
        industry = expert.get("industry", "")
        parts = []
        if years >= 10:
            parts.append(f"{years}+ years experience")
        elif years >= 5:
            parts.append(f"{years} years in field")
        if industry and self.target_industry and industry_match > 0.5:
            parts.append(f"industry match: {industry}")
        if rate and 100 <= rate <= 400:
            parts.append(f"rate ${rate:.0f}/hr aligned")
        if self.graph_engine and network_norm > 0.3:
            parts.append("strong network influence")
        reasoning = "High match" if composite >= 0.6 else "Moderate match"
        if parts:
            reasoning += " due to " + ", ".join(parts)
        else:
            reasoning += " based on profile"

        return round(float(composite), 4), reasoning

    def rank_experts(
        self,
        experts: list[dict[str, Any]],
        semantic_map: dict[str, float],
    ) -> list[dict[str, Any]]:
        """Score all experts and return sorted by composite score."""
        scored = []
        for ex in experts:
            sim = semantic_map.get(ex["id"], 0.5)  # default if no vector
            score, reasoning = self.compute_composite_score(ex, sim)
            scored.append(
                {
                    **ex,
                    "confidence_score": score,
                    "reasoning": reasoning,
                    "semantic_similarity": sim,
                }
            )
        return sorted(scored, key=lambda x: x["confidence_score"], reverse=True)


def run_xgboost_ranker(experts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Re-rank experts using XGBoost.
    Uses seniority_score, years_experience, predicted_rate, semantic_similarity.
    """
    if not experts:
        return []
    if len(experts) == 1:
        ex = experts[0].copy()
        ex.setdefault("confidence_score", ex.get("confidence_score", 0.5))
        return [ex]

    df = pd.DataFrame(
        [
            {
                "seniority_score": e.get("seniority_score", 50),
                "years_experience": e.get("years_experience", 5),
                "predicted_rate": e.get("predicted_rate", 200),
                "confidence_score": e.get("confidence_score", 0.5),
                "semantic_similarity": e.get("semantic_similarity", 0.5),
                "_expert": e,
            }
            for e in experts
        ]
    )

    # Feature matrix for XGBoost
    features = df[
        [
            "seniority_score",
            "years_experience",
            "predicted_rate",
            "confidence_score",
            "semantic_similarity",
        ]
    ].fillna(0.5)

    # Target: confidence_score (XGBoost learns non-linear re-weighting)
    y = df["confidence_score"].values

    model = xgb.XGBRegressor(n_estimators=10, max_depth=3, random_state=42)
    model.fit(features, y)

    df["xgboost_score"] = model.predict(features)
    df = df.sort_values("xgboost_score", ascending=False)

    # Update confidence_score with XGBoost-refined value
    result = []
    for _, row in df.iterrows():
        ex = row["_expert"].copy()
        ex["confidence_score"] = round(float(row["xgboost_score"]), 4)
        result.append(ex)

    return result
