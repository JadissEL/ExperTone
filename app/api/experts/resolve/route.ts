/**
 * Identity Resolution: resolve expert by name.
 * Returns single expert if resolved, or disambiguation candidates.
 * GET /api/experts/resolve?name=John+Smith&projectId=xxx&expertId=xxx&matchScore=0.82
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { parseQuery } from '@/lib/api-validate';
import { expertResolveQuerySchema } from '@/lib/schemas/api';
import { resolveByName } from '@/lib/identity-resolver';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/errors';
import { startRequestTimer } from '@/lib/api-instrument';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const timer = startRequestTimer('/api/experts/resolve', 'GET');
  const { userId } = await auth();
  if (!userId) {
    timer.done(401);
    return apiError(401, 'Unauthorized', { code: 'UNAUTHORIZED' });
  }

  const parsed = parseQuery(expertResolveQuerySchema, Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    timer.done(400);
    return parsed.response;
  }
  const { name, projectId, expertId, matchScore } = parsed.data;

  try {
    // If expertId provided (e.g. from Hunter row), fetch expert directly and return
    if (expertId) {
      const expert = await prisma.expert.findUnique({
        where: { id: expertId },
        select: { id: true, name: true, industry: true, subIndustry: true, country: true },
      });
      if (expert) {
        timer.done(200);
        return NextResponse.json({
          resolved: true,
          expert: {
            id: expert.id,
            name: expert.name,
            industry: expert.industry,
            subIndustry: expert.subIndustry,
            country: expert.country,
          },
        });
      }
    }

    const result = await resolveByName(name, {
      projectId: projectId ?? undefined,
      matchScore: matchScore ?? undefined,
    });

    timer.done(200);
    return NextResponse.json(result);
  } catch (err) {
    timer.done(500);
    logger.error({ err }, '[experts/resolve] Failed');
    return apiError(500, 'Resolution failed', {
      code: 'RESOLUTION_ERROR',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
