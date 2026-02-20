/**
 * ML-Proxy: Service wrapper for the FastAPI Microservice (System Genesis 10.3).
 * XGBoost rate prediction, NetworkX graph generation, and ranking.
 */

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function fetchML<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', body } = options;
  const res = await fetch(`${ML_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML service ${path}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Health check */
export async function mlHealth(): Promise<{ status: string }> {
  return fetchML('/health');
}

/** Suggested rate (XGBoost / Ridge) for Fair Market Value */
export async function getSuggestedRate(params: {
  seniority_score?: number;
  years_experience?: number;
  country?: string;
  region?: string;
  industry?: string;
}): Promise<{ predicted_rate: number; suggested_rate_min: number; suggested_rate_max: number }> {
  return fetchML('/insights/suggested-rate', { method: 'POST', body: params });
}

/** Graph data for Relationship Hubs (NetworkX + Louvain) */
export async function getGraphData(limit: number = 200): Promise<{
  nodes: Array<{ id: string; label: string; group: string; val?: number; community?: number }>;
  links: Array<{ source: string; target: string; type?: string }>;
}> {
  return fetchML('/insights/graph', { method: 'POST', body: { limit } });
}

/** Rank experts for a project (XGBoost + composite scoring) */
export async function rankExperts(projectId: string): Promise<{
  project_id: string;
  ranked_experts: Array<{ expert_id: string; name: string; industry: string; confidence_score: number; reasoning: string }>;
}> {
  return fetchML('/rank', { method: 'POST', body: { project_id: projectId } });
}
