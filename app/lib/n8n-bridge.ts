/**
 * Bridge to n8n Expert Hunter workflow.
 * Triggers the /webhook/hunt endpoint for research projects.
 * Service discovery: N8N_WEBHOOK_URL (full URL) or N8N_BASE_URL + /webhook/hunt
 */

const N8N_BASE = process.env.N8N_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5678';

/** Production webhook URL for Expert Hunter workflow */
export const EXPERT_HUNTER_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || `${N8N_BASE}/webhook/hunt`;

/** True when n8n URL points to localhost or placeholder (unreachable from Vercel) */
export const isN8nLocalhost =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?/i.test(EXPERT_HUNTER_WEBHOOK_URL) ||
  EXPERT_HUNTER_WEBHOOK_URL.includes('REPLACE_WITH');

export interface HuntPayload {
  projectId?: string;
  projectTitle?: string;
  filterCriteria?: Record<string, unknown>;
  query?: string;
  [key: string]: unknown;
}

/**
 * Trigger the Expert Hunter workflow via webhook.
 * Call this when starting a research project to kick off expert discovery.
 */
export async function triggerExpertHunt(payload: HuntPayload): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(EXPERT_HUNTER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Webhook failed: ${res.status} ${text}` };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: msg };
  }
}
