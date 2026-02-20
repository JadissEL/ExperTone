import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSignatureFromRequest, verifyHmacPayload } from '@/lib/webhook-verify';

/**
 * GET: Frontend polls for Live Progress Bento (auth required).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await (await import('@clerk/nextjs/server')).auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: projectId } = await params;
  // Schema has progress, currentAction, lastHeartbeatAt; Prisma client types may lag until regenerate
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { progress: true, currentAction: true, lastHeartbeatAt: true, status: true, creatorId: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (user && project.creatorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const p = project as { status: string; progress?: number | null; currentAction?: string | null; lastHeartbeatAt?: Date | null; creatorId: string };
  return NextResponse.json({
    status: p.status,
    progress: p.progress ?? 0,
    current_action: p.currentAction ?? null,
    last_heartbeat_at: p.lastHeartbeatAt?.toISOString() ?? null,
  });
}

/**
 * POST: n8n State Sense - update status after each major phase.
 * Body: { status?, progress?, current_action?, request_id? }
 * Headers: X-Webhook-Signature = HMAC-SHA256(body) for authentication.
 * Idempotency: if request_id provided and already processed, return 200 without updating.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rawBody = await req.text();
  const signature = getSignatureFromRequest(req.headers);

  if (process.env.HMAC_SECRET || process.env.SHARED_SECRET || process.env.N8N_WEBHOOK_SECRET) {
    if (!verifyHmacPayload(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body: { status?: string; progress?: number; current_action?: string; request_id?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id: projectId } = await params;
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const requestId = body.request_id?.trim();
  const db = prisma as unknown as { processedRequest: { findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null> }; researchProject: { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> } };
  if (requestId) {
    const existing = await db.processedRequest.findUnique({ where: { id: requestId } });
    if (existing) {
      return NextResponse.json({ ok: true, idempotent: true });
    }
  }

  const progress = typeof body.progress === 'number' ? Math.min(100, Math.max(0, body.progress)) : undefined;
  const currentAction = typeof body.current_action === 'string' ? body.current_action.slice(0, 200) : undefined;
  const statusVal = body.status?.trim();
  const validStatus = statusVal && ['PENDING', 'RUNNING', 'COMPLETED'].includes(statusVal) ? statusVal : undefined;

  const txDb = prisma as unknown as {
    processedRequest: { upsert: (a: { where: { id: string }; create: { id: string }; update: object }) => Promise<unknown> };
    researchProject: { update: (a: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> };
  };
  await prisma.$transaction(async (tx) => {
    const t = tx as unknown as typeof txDb;
    if (requestId) {
      await t.processedRequest.upsert({ where: { id: requestId }, create: { id: requestId }, update: {} });
    }
    await t.researchProject.update({
      where: { id: projectId },
      data: {
        ...(progress !== undefined && { progress }),
        ...(currentAction !== undefined && { currentAction }),
        ...(validStatus && { status: validStatus }),
        lastHeartbeatAt: new Date(),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
