"""
Smart Rate Estimator: XGBoost/scikit-learn regression for suggested market rate.
Features: seniority, geography tier, years of experience, industry (encoded).
"""

import json
from pathlib import Path
from typing import Any

import numpy as np

from database import get_connection

# Try XGBoost first, fallback to sklearn
try:
    import xgboost as xgb

    HAS_XGB = True
except ImportError:
    HAS_XGB = False
from sklearn.linear_model import Ridge
from sklearn.preprocessing import LabelEncoder

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "rate_model.json"
ENCODER_INDUSTRY_PATH = MODEL_DIR / "industry_encoder.json"

# Geography tier: 1 = high (NA, UK, CH, etc.), 2 = mid (EU, AU), 3 = lower cost
GEO_TIER_1 = {
    "na",
    "north america",
    "uk",
    "united kingdom",
    "usa",
    "canada",
    "switzerland",
    "singapore",
    "uae",
}
GEO_TIER_2 = {"emea", "europe", "australia", "germany", "france", "netherlands", "sweden"}


def _geo_tier(region: str, country: str) -> int:
    r = (region or "").lower().strip()
    c = (country or "").lower().strip()
    combined = f"{r} {c}"
    for t in GEO_TIER_1:
        if t in combined:
            return 1
    for t in GEO_TIER_2:
        if t in combined:
            return 2
    return 3


def _load_training_data(limit: int = 2000) -> tuple[list[dict[str, Any]], list[float]]:
    """Fetch experts with predicted_rate as target for training."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT seniority_score, years_experience, region, country, industry, predicted_rate
                FROM experts
                WHERE predicted_rate > 0 AND predicted_rate < 2000
                ORDER BY updated_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    if not rows:
        return [], []
    x_list: list[dict[str, Any]] = []
    y_list: list[float] = []
    for r in rows:
        seniority, years, region, country, industry, rate = r
        geo = _geo_tier(region or "", country or "")
        x_list.append(
            {
                "seniority_score": seniority or 50,
                "years_experience": min(50, max(0, years or 5)),
                "geo_tier": geo,
                "industry": (industry or "Other").strip(),
            }
        )
        y_list.append(float(rate))
    return x_list, y_list


def _load_training_data_from_engagements(
    limit: int = 2000,
) -> tuple[list[dict[str, Any]], list[float]]:
    """Fetch (expert features, actual_cost) from engagements for Feedback Loop retraining."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.seniority_score, e.years_experience, e.region, e.country, e.industry, eng.actual_cost
                FROM engagements eng
                JOIN experts e ON e.id = eng.expert_id
                WHERE eng.actual_cost > 0 AND eng.actual_cost < 2000
                ORDER BY eng.date DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    if not rows:
        return [], []
    x_list: list[dict[str, Any]] = []
    y_list: list[float] = []
    for r in rows:
        seniority, years, region, country, industry, actual_cost = r
        geo = _geo_tier(region or "", country or "")
        x_list.append(
            {
                "seniority_score": seniority or 50,
                "years_experience": min(50, max(0, years or 5)),
                "geo_tier": geo,
                "industry": (industry or "Other").strip(),
            }
        )
        y_list.append(float(actual_cost))
    return x_list, y_list


def _encode_features(
    x_list: list[dict[str, Any]],
    industry_encoder: LabelEncoder | None = None,
    fit: bool = False,
) -> tuple[Any, LabelEncoder | None]:
    """Convert dict list to numpy array. industry is label-encoded."""
    industries = [x["industry"] for x in x_list]
    if fit and industry_encoder is None:
        industry_encoder = LabelEncoder()
        industry_encoder.fit(industries)
    if industry_encoder is not None:
        try:
            ind_encoded = industry_encoder.transform(industries)
        except ValueError:
            ind_encoded = np.zeros(len(industries), dtype=int)
    else:
        ind_encoded = np.zeros(len(industries), dtype=int)

    arr = np.array(
        [
            [
                x["seniority_score"] / 100.0,
                x["years_experience"] / 50.0,
                x["geo_tier"] / 3.0,
                ind_encoded[i],
            ]
            for i, x in enumerate(x_list)
        ],
        dtype=np.float32,
    )
    return arr, industry_encoder


def train_and_save(use_engagements: bool = False) -> dict[str, Any]:
    """Train model on DB experts or engagement actuals (Feedback Loop). Saves to disk. Returns metrics."""
    if use_engagements:
        x_list, y_list = _load_training_data_from_engagements()
    else:
        x_list, y_list = _load_training_data()
    if len(x_list) < 10:
        return {
            "ok": False,
            "reason": "Not enough data (need at least 10 samples)",
            "source": "engagements" if use_engagements else "experts",
        }
    features, industry_encoder = _encode_features(x_list, fit=True)
    if industry_encoder is None:
        raise ValueError("Encoder required when fit=True")
    y = np.array(y_list, dtype=np.float32)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if HAS_XGB:
        model = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
        model.fit(features, y)
        model.save_model(str(MODEL_PATH))
    else:
        model = Ridge(alpha=1.0)
        model.fit(features, y)
        np.save(MODEL_PATH.with_suffix(".npy"), model.coef_)
        np.save(
            MODEL_PATH.with_suffix(".npy").with_name("rate_intercept.npy"),
            np.array([model.intercept_]),
        )

    with open(ENCODER_INDUSTRY_PATH, "w") as f:
        json.dump(industry_encoder.classes_.tolist(), f)

    pred = model.predict(features)
    mae = float(np.mean(np.abs(pred - y)))
    return {"ok": True, "samples": len(y_list), "mae": round(mae, 2)}


def load_model() -> tuple[Any | None, LabelEncoder]:
    """Load trained model and encoder from disk."""
    industry_classes = []
    if ENCODER_INDUSTRY_PATH.exists():
        with open(ENCODER_INDUSTRY_PATH) as f:
            industry_classes = json.load(f)
    encoder = LabelEncoder()
    encoder.classes_ = np.array(industry_classes) if industry_classes else np.array(["Other"])

    if HAS_XGB and MODEL_PATH.exists():
        model = xgb.XGBRegressor()
        model.load_model(str(MODEL_PATH))
        return model, encoder
    if not HAS_XGB and (MODEL_DIR / "rate_coef.npy").exists():
        coef = np.load(MODEL_DIR / "rate_coef.npy")
        intercept = np.load(MODEL_DIR / "rate_intercept.npy")[0]
        n_f = int(np.load(MODEL_DIR / "rate_n_features.npy")[0])
        model = Ridge()
        model.coef_ = coef
        model.intercept_ = intercept
        model.n_features_in_ = n_f
        return model, encoder
    return None, encoder


def predict_rate(
    seniority_score: int, years_experience: int, country: str, region: str, industry: str
) -> dict[str, float]:
    """
    Return suggested market rate (point estimate and range).
    Range is ±20% around prediction (or MAE-based if we had it stored).
    """
    model, encoder = load_model()
    geo = _geo_tier(region or "", country or "")
    ind = (industry or "Other").strip()
    try:
        ind_encoded = encoder.transform([ind])[0]
    except ValueError:
        ind_encoded = 0
    input_row = np.array(
        [
            [
                (seniority_score or 50) / 100.0,
                min(50, max(0, years_experience or 5)) / 50.0,
                geo / 3.0,
                ind_encoded,
            ]
        ],
        dtype=np.float32,
    )

    if model is not None:
        pred = float(model.predict(input_row)[0])
    else:
        # Fallback formula
        pred = 100 + (years_experience or 5) * 15 + (seniority_score or 50) * 0.8
        if geo == 1:
            pred *= 1.2
        elif geo == 3:
            pred *= 0.85
    pred = max(80, min(800, pred))
    spread = pred * 0.2
    return {
        "predicted_rate": round(pred, 2),
        "suggested_rate_min": round(max(50, pred - spread), 2),
        "suggested_rate_max": round(min(1000, pred + spread), 2),
    }
