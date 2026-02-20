/**
 * One-Click Capture: Add expert to project (ownership / Research Result).
 * Creates ResearchResult; project must belong to current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { persistComplianceGuard } from '@/lib/compliance-guard';
import { parseBody } from '@/lib/api-validate';
import { addToProjectBodySchema } from '@/lib/schemas/api';

export async function POST(req: NextRequest) {
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

  const parsed = parseBody(addToProjectBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { projectId, expertId, matchScore: rawMatchScore } = parsed.data;
  const matchScore = typeof rawMatchScore === 'number' ? Math.min(1, Math.max(0, rawMatchScore)) : 0.75;

  const creatorId = await getOrCreateCurrentUser();
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { id: true, creatorId: true },
  });
  if (!project || project.creatorId !== creatorId) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
  }

  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { id: true },
  });
  if (!expert) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }

  try {
    await prisma.researchResult.upsert({
      where: {
        projectId_expertId: { projectId, expertId },
      },
      create: {
        projectId,
        expertId,
        matchScore,
        classificationTier: 'B',
      },
      update: { matchScore },
    });
    void persistComplianceGuard(expertId, projectId).catch((err) =>
      console.warn('[Hunter add-to-project] compliance guard failed:', err)
    );
    return NextResponse.json({ ok: true, projectId, expertId, message: 'Added to project.' });
  } catch (err) {
    console.error('[Hunter add-to-project]', err);
    return NextResponse.json({ error: 'Failed to add to project' }, { status: 500 });
  }
}
