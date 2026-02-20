import { createHmac, timingSafeEqual } from 'crypto';

const SHARED_SECRET = process.env.HMAC_SECRET || process.env.SHARED_SECRET || process.env.N8N_WEBHOOK_SECRET || '';

/**
 * Verify HMAC-SHA256 signature from n8n webhook.
 * n8n can send X-Webhook-Signature or Authorization: HMAC <sig>.
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signature: string | null
): boolean {
  if (!SHARED_SECRET || !signature) return false;

  const expected = createHmac('sha256', SHARED_SECRET)
    .update(typeof body === 'string' ? body : body.toString('utf8'))
    .digest('hex');

  const provided = signature.replace(/^HMAC\s+/i, '').replace(/^sha256=/, '').trim();

  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}

export function getSignatureFromRequest(headers: Headers): string | null {
  return (
    headers.get('x-webhook-signature') ||
    headers.get('x-n8n-signature') ||
    headers.get('x-signature') ||
    headers.get('authorization')?.replace(/^HMAC\s+/i, '').trim() ||
    null
  );
}

/** Build canonical query string for GET request signing (sorted keys). */
export function canonicalQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? '')}`)
    .join('&');
}

/** Verify HMAC of a payload (e.g. JSON body or query string). Uses HMAC_SECRET or SHARED_SECRET. */
export function verifyHmacPayload(payload: string | Buffer, signature: string | null): boolean {
  return verifyWebhookSignature(payload, signature);
}
