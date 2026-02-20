import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { persistComplianceGuard } from '@/lib/compliance-guard';
import { generateEmbedding } from '@/lib/openai';
import { parseParams } from '@/lib/api-validate';
import { taskIdParamsSchema } from '@/lib/schemas/api';

/**
 * POST: Create an Expert (and optional ResearchResult) from a completed MAS task's Elite Profile.
 * Only project creator can call. Task must have eliteProfile.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const awaitedParams = await params;
  const paramsParsed = parseParams(taskIdParamsSchema, awaitedParams);
  if (!paramsParsed.success) return paramsParsed.response;
  const { id: taskId } = paramsParsed.data;

  const creatorId = await getOrCreateCurrentUser();

  const task = await prisma.agentTaskState.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, creatorId: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  if (task.project.creatorId !== creatorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (task.expertId) {
    return NextResponse.json(
      { error: 'Expert already created from this task.' },
      { status: 400 }
    );
  }

  const elite = task.eliteProfile as {
    structured?: { seniority?: string; functionalDomain?: string; yearsExperience?: number };
    pricing?: { rateMin?: number; rateMax?: number };
  } | null;
  if (!elite?.structured) {
    return NextResponse.json(
      { error: 'Task has no Elite Profile; run the pipeline first.' },
      { status: 400 }
    );
  }

  const structured = elite.structured ?? {};
  const pricing = elite.pricing ?? {};
  const seniorityText = String(structured.seniority ?? '').toLowerCase();
  const seniorityScore = seniorityToScore(seniorityText);
  const yearsExperience = Math.max(0, Math.min(50, Number(structured.yearsExperience) || 0));
  const rateMin = typeof pricing.rateMin === 'number' ? pricing.rateMin : 0;
  const rateMax = typeof pricing.rateMax === 'number' ? pricing.rateMax : rateMin || 200;
  const predictedRate = rateMin && rateMax ? (rateMin + rateMax) / 2 : rateMax || rateMin || 150;
  const domain = String(structured.functionalDomain ?? 'General').slice(0, 100);
  const name = (task.candidateLabel ?? `Expert ${domain}`).slice(0, 200);

  const expert = await prisma.expert.create({
    data: {
      name,
      industry: domain,
      subIndustry: domain,
      country: 'Unknown',
      region: 'Unknown',
      seniorityScore,
      yearsExperience,
      predictedRate,
      ownerId: task.project.creatorId,
      predictedRateRange: rateMin || rateMax ? [rateMin, rateMax] : undefined,
    },
  });

  await prisma.researchResult.create({
    data: {
      projectId: task.projectId,
      expertId: expert.id,
      matchScore: 0.75,
      classificationTier: 'B',
    },
  });

  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: { expertId: expert.id },
  });
  void persistComplianceGuard(expert.id, task.projectId).catch((err) =>
    console.warn('[create-expert] compliance guard failed:', err)
  );

  let embeddingCreated = false;
  const embeddingText = [name, domain, structured.seniority].filter(Boolean).join(' ');
  if (embeddingText.trim().length > 0) {
    try {
      const embedding = await generateEmbedding(embeddingText.trim().slice(0, 8000));
      const vectorStr = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO expert_vectors (id, expert_id, embedding) VALUES ($1, $2, $3::vector)`,
        randomUUID() as string,
        expert.id,
        vectorStr
      );
      embeddingCreated = true;
    } catch (err) {
      console.warn('[create-expert] Embedding failed, expert created without vector:', err);
    }
  }

  return NextResponse.json({
    expertId: expert.id,
    name: expert.name,
    message: 'Expert added to pool and linked to this project.',
    embeddingCreated,
  });
}

function seniorityToScore(text: string): number {
  if (!text) return 50;
  if (/\b(c-?suite|ceo|cto|cfo|vp|vice president|svp|evp)\b/i.test(text)) return 88;
  if (/\b(director|head of)\b/i.test(text)) return 72;
  if (/\b(manager|lead)\b/i.test(text)) return 58;
  if (/\b(senior|sr\.?)\b/i.test(text)) return 48;
  if (/\b(analyst|consultant|specialist)\b/i.test(text)) return 38;
  return 50;
}
