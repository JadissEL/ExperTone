import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { parseBody, parseParams } from '@/lib/api-validate';
import { resolveInterventionBodySchema, interventionIdParamsSchema } from '@/lib/schemas/api';

/**
 * POST: CSA confirms or discards a match (Human-in-the-Loop).
 * Body: { action: 'PROCEED' | 'DISCARD' }
 * Calls n8n's resume webhook with the action so the workflow continues.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const bodyParsed = parseBody(resolveInterventionBodySchema, rawBody);
  if (!bodyParsed.success) return bodyParsed.response;
  const { action } = bodyParsed.data;

  const awaitedParams = await params;
  const paramsParsed = parseParams(interventionIdParamsSchema, awaitedParams);
  if (!paramsParsed.success) return paramsParsed.response;
  const { id: interventionId } = paramsParsed.data;
  const intervention = await prisma.pendingIntervention.findUnique({
    where: { id: interventionId },
  });

  if (!intervention) {
    return NextResponse.json({ error: 'Intervention not found' }, { status: 404 });
  }
  if (intervention.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already resolved', status: intervention.status }, { status: 409 });
  }

  const project = await prisma.researchProject.findUnique({
    where: { id: intervention.projectId },
    select: { creatorId: true },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let userDbId: string;
  try {
    userDbId = await getOrCreateCurrentUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (project.creatorId !== userDbId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const res = await fetch(intervention.n8nResumeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[Intervention] n8n resume failed:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to notify n8n', details: text },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error('[Intervention] n8n resume error:', err);
    return NextResponse.json(
      { error: 'Failed to reach n8n webhook' },
      { status: 502 }
    );
  }

  await prisma.pendingIntervention.update({
    where: { id: interventionId },
    data: {
      status: action === 'PROCEED' ? 'CONFIRMED' : 'DISCARDED',
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, action });
}
