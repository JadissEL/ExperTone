/**
 * ML Service Client - Robust TypeScript client for FastAPI microservice.
 * Features: 10s timeout, circuit breaker, embedding cache, fallback to basic search.
 */

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL?.replace(/\/$/, '') || 'http://localhost:8000';
const TIMEOUT_MS = 10_000;
const CIRCUIT_OPEN_MS = 30_000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for embeddings

let circuitOpenUntil = 0;

/** Simple LRU cache for brief embeddings (reduces redundant ML processing) */
const embeddingCache = new Map<string, { embedding: number[]; expires: number }>();
const CACHE_MAX_SIZE = 100;

function cacheKey(text: string): string {
  const normalized = text.trim().toLowerCase().slice(0, 500);
  return `emb:${normalized}`;
}

function getCachedEmbedding(text: string): number[] | null {
  const key = cacheKey(text);
  const entry = embeddingCache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.embedding;
}

function setCachedEmbedding(text: string, embedding: number[]): void {
  const key = cacheKey(text);
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(key, {
    embedding,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function openCircuit(): void {
  circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    openCircuit();
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
}

/**
 * Get embedding for search intent. Uses cache for frequent briefs.
 * Throws if ML service is down (caller should fallback to basic search).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const cached = getCachedEmbedding(text);
  if (cached) return cached;

  if (isCircuitOpen()) {
    throw new Error('ML_SERVICE_UNAVAILABLE');
  }

  const res = await fetchWithTimeout(
    `${ML_SERVICE_URL}/embeddings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim().slice(0, 2000) }),
    },
    TIMEOUT_MS
  );

  if (!res.ok) {
    openCircuit();
    throw new Error(`ML embeddings failed: ${res.status}`);
  }

  const data = (await res.json()) as EmbeddingResponse;
  const embedding = data.embedding;
  if (!Array.isArray(embedding) || embedding.length !== 1536) {
    throw new Error('Invalid embedding response');
  }

  setCachedEmbedding(text, embedding);
  return embedding;
}

export interface RankResponse {
  project_id: string;
  ranked_experts: Array<{
    expert_id: string;
    name?: string;
    industry?: string;
    confidence_score?: number;
    reasoning?: string;
  }>;
}

/**
 * Rank experts for a project. Falls back to null if ML is down.
 */
export async function rankExperts(projectId: string): Promise<RankResponse | null> {
  if (isCircuitOpen()) return null;

  try {
    const res = await fetchWithTimeout(
      `${ML_SERVICE_URL}/rank`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      },
      TIMEOUT_MS
    );

    if (!res.ok) {
      openCircuit();
      return null;
    }

    return (await res.json()) as RankResponse;
  } catch {
    openCircuit();
    return null;
  }
}

/**
 * Check if ML service is healthy.
 */
export async function mlHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { isCircuitOpen };
