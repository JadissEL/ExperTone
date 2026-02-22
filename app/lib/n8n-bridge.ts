/**
 * Bridge to n8n Expert Hunter workflow.
 * Triggers the /webhook/hunt endpoint for research projects.
 * Service discovery: N8N_WEBHOOK_URL (full URL) or N8N_BASE_URL + /webhook/hunt
 */

import { createHmac } from 'crypto';

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
  brief?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Enriches payload for Expert Hunter workflow compatibility.
 * - Adds timestamp for replay protection (n8n Check Timestamp)
 * - Adds brief when present so n8n Has Brief? triggers AI parsing
 */
export function adaptHuntPayload(payload: HuntPayload): HuntPayload {
  const brief = payload.brief ?? (payload.filterCriteria as { brief?: string })?.brief ?? (payload.query && payload.query.length > 150 ? payload.query : undefined);
  return {
    ...payload,
    timestamp: new Date().toISOString(),
    ...(brief ? { brief } : {}),
  };
}

/**
 * Sign payload for n8n Verify Webhook Signature (HMAC-SHA256).
 * Uses SHARED_SECRET or N8N_WEBHOOK_SECRET; must match n8n $env.WEBHOOK_SECRET.
 */
export function signPayload(bodyString: string): string {
  const secret = process.env.SHARED_SECRET || process.env.N8N_WEBHOOK_SECRET || '';
  if (!secret) return '';
  return createHmac('sha256', secret).update(bodyString).digest('hex');
}

/**
 * Trigger the Expert Hunter workflow via webhook.
 * Payload is adapted for n8n compatibility (timestamp, brief).
 * Signs request when SHARED_SECRET is set (n8n Verify Webhook Signature).
 */
export async function triggerExpertHunt(payload: HuntPayload): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const adapted = adaptHuntPayload(payload);
  const bodyString = JSON.stringify(adapted);
  const signature = signPayload(bodyString);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) headers['X-Webhook-Signature'] = signature;

  try {
    const res = await fetch(EXPERT_HUNTER_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: bodyString,
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
