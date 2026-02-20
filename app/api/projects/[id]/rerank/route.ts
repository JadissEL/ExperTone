import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { rankExperts } from '@/lib/ml-client';
import { parseParams } from '@/lib/api-validate';
import { projectIdParamsSchema } from '@/lib/schemas/api';

/**
 * Final re-rank: Trigger ML service to re-rank project experts after n8n batch complete.
 * Falls back to existing results if ML is down.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paramsParsed = parseParams(projectIdParamsSchema, await params);
  if (!paramsParsed.success) return paramsParsed.response;
  const { id: projectId } = paramsParsed.data;

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: { results: { orderBy: { matchScore: 'desc' } } },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const ranked = await rankExperts(projectId);

  if (ranked?.ranked_experts?.length) {
    const scoreToTier = (s: number) =>
      s >= 0.8 ? 'S' : s >= 0.6 ? 'A' : s >= 0.4 ? 'B' : 'C';

    await prisma.researchResult.deleteMany({ where: { projectId } });
    await prisma.researchResult.createMany({
      data: ranked.ranked_experts.map((e) => ({
        projectId,
        expertId: e.expert_id,
        matchScore: e.confidence_score ?? 0.5,
        classificationTier: scoreToTier(e.confidence_score ?? 0.5),
      })),
      skipDuplicates: true,
    });
  }

  const updated = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: { results: { orderBy: { matchScore: 'desc' }, include: { expert: true } } },
  });

  return NextResponse.json({
    ok: true,
    reranked: !!ranked?.ranked_experts?.length,
    results: updated?.results ?? [],
  });
}
