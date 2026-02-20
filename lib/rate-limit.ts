/**
 * In-memory rate limiter for expensive operations (e.g. Search trigger).
 * Use per-user (Clerk userId) to prevent API abuse and control Grok/n8n costs.
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // per user per minute for search

function prune() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt < now) store.delete(k);
  }
}

/**
 * Check and consume one request for key. Returns true if allowed, false if rate limited.
 */
export function rateLimitSearch(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  prune();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: now + WINDOW_MS };
  }
  if (entry.resetAt < now) {
    entry.count = 1;
    entry.resetAt = now + WINDOW_MS;
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: entry.resetAt };
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - entry.count,
    resetAt: entry.resetAt,
  };
}
