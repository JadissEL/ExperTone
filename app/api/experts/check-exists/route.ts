import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSignatureFromRequest, verifyHmacPayload, canonicalQueryString } from '@/lib/webhook-verify';

/**
 * GET: n8n Knowledge Check - does an expert already exist?
 * Query: name, linkedin_url, email_hash, request_id (optional, for idempotency).
 * n8n must send X-Signature (or X-Webhook-Signature): HMAC-SHA256(canonical_query_string).
 * Returns { exists: boolean } so n8n can branch to ENRICH (exists) vs CREATE (!exists).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryObj = Object.fromEntries(url.searchParams.entries());

  const { parseQuery } = await import('@/lib/api-validate');
  const { checkExistsQuerySchema } = await import('@/lib/schemas/api');
  const parsed = parseQuery(checkExistsQuerySchema, queryObj);
  if (!parsed.success) return parsed.response;
  const { name, linkedin_url: linkedinUrl, email_hash: emailHash, request_id: requestId } = parsed.data;

  const params: Record<string, string> = {};
  if (name) params.name = name;
  if (linkedinUrl) params.linkedin_url = linkedinUrl;
  if (emailHash) params.email_hash = emailHash;
  if (requestId) params.request_id = requestId;

  const signature = getSignatureFromRequest(req.headers);
  if (process.env.HMAC_SECRET || process.env.SHARED_SECRET || process.env.N8N_WEBHOOK_SECRET) {
    const canonical = canonicalQueryString(params);
    if (!verifyHmacPayload(canonical, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  if (requestId) {
    const db = prisma as unknown as { processedRequest: { findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null> }; systemConfig: { findUnique: (args: { where: { key: string } }) => Promise<{ value: unknown } | null> } };
    const existing = await db.processedRequest.findUnique({ where: { id: requestId } });
    if (existing) {
      const cached = await db.systemConfig.findUnique({ where: { key: `check_exists:${requestId}` } });
      const exists = cached?.value as boolean | undefined;
      return NextResponse.json({ exists: exists ?? false, idempotent: true });
    }
  }

  let exists = false;

  if (linkedinUrl) {
    const byLinkedIn = await prisma.expert.findFirst({
      where: { linkedinUrl: linkedinUrl } as Record<string, unknown>,
      select: { id: true },
    });
    if (byLinkedIn) {
      exists = true;
    }
  }

  if (!exists && emailHash) {
    const byEmailHash = await prisma.expert.findFirst({
      where: { emailHash: emailHash } as Record<string, unknown>,
      select: { id: true },
    });
    if (byEmailHash) exists = true;
  }

  if (!exists && name) {
    const norm = name.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
    const byName = await prisma.expert.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (byName) exists = true;
    if (!exists && norm.length >= 3) {
      const bySimilar = await prisma.expert.findFirst({
        where: { name: { contains: norm.slice(0, 50), mode: 'insensitive' } },
        select: { id: true },
      });
      if (bySimilar) exists = true;
    }
  }

  if (requestId) {
    const db = prisma as unknown as { processedRequest: { upsert: (a: { where: { id: string }; create: { id: string }; update: object }) => Promise<unknown> }; systemConfig: { upsert: (a: { where: { key: string }; create: { key: string; value: boolean }; update: { value: boolean } }) => Promise<unknown> } };
    await prisma.$transaction(async (tx) => {
      const txDb = tx as unknown as typeof db;
      await txDb.processedRequest.upsert({ where: { id: requestId }, create: { id: requestId }, update: {} });
      await txDb.systemConfig.upsert({
        where: { key: `check_exists:${requestId}` },
        create: { key: `check_exists:${requestId}`, value: exists },
        update: { value: exists },
      });
    });
  }

  return NextResponse.json({ exists });
}
