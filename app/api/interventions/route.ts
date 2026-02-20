import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getSignatureFromRequest, verifyHmacPayload } from '@/lib/webhook-verify';

/**
 * POST: n8n registers a pending intervention (ML score 50-70%).
 * Body: { project_id, request_id, expert_payload, score, n8n_resume_url }
 * Headers: X-Webhook-Signature = HMAC(body). Idempotent by request_id.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = getSignatureFromRequest(req.headers);

  if (process.env.HMAC_SECRET || process.env.SHARED_SECRET || process.env.N8N_WEBHOOK_SECRET) {
    if (!verifyHmacPayload(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { parseBody } = await import('@/lib/api-validate');
  const { interventionsPostBodySchema } = await import('@/lib/schemas/api');
  const parsed = parseBody(interventionsPostBodySchema, rawPayload);
  if (!parsed.success) return parsed.response;
  const { project_id: projectId, request_id: requestId, expert_payload: expertPayload, score: rawScore, n8n_resume_url: n8nResumeUrl } = parsed.data;
  const score = typeof rawScore === 'number' ? rawScore : 0;

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const existing = await prisma.pendingIntervention.findUnique({
    where: { requestId },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id, status: existing.status, idempotent: true });
  }

  const intervention = await prisma.pendingIntervention.create({
    data: {
      projectId,
      requestId,
      expertPayload: (expertPayload ?? {}) as object,
      score,
      n8nResumeUrl,
      status: 'PENDING',
    },
  });

  return NextResponse.json({ id: intervention.id, status: 'PENDING' });
}

/**
 * GET: List pending interventions for the dashboard (auth required).
 * Query: projectId (optional) - filter by project.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { parseQuery } = await import('@/lib/api-validate');
  const { interventionsQuerySchema } = await import('@/lib/schemas/api');
  const queryParsed = parseQuery(interventionsQuerySchema, Object.fromEntries(new URL(req.url).searchParams.entries()));
  if (!queryParsed.success) return queryParsed.response;
  const { projectId } = queryParsed.data;
  const projectIdStr = typeof projectId === 'string' && projectId.length > 0 ? projectId : undefined;

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ interventions: [] });
  }

  const where: { projectId?: string | { in: string[] }; status: string } = { status: 'PENDING' };
  if (projectIdStr) {
    const project = await prisma.researchProject.findFirst({
      where: { id: projectIdStr, creatorId: user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ interventions: [] });
    }
    where.projectId = projectIdStr;
  } else {
    const myProjects = await prisma.researchProject.findMany({
      where: { creatorId: user.id },
      select: { id: true },
    });
    where.projectId = { in: myProjects.map((p) => p.id) };
  }

  const interventions = await prisma.pendingIntervention.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    interventions: interventions.map((i) => ({
      id: i.id,
      projectId: i.projectId,
      requestId: i.requestId,
      expertPayload: i.expertPayload,
      score: i.score,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
