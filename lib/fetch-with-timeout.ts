/**
 * Fetch with timeout and optional AbortController.
 * Use for external API calls (ML service, n8n webhooks).
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}
