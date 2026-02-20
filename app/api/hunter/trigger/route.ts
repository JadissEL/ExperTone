/**
 * Proactive Hunt: Hunter Trigger — sends search params to n8n.
 * n8n runs 5 parallel agents: LinkedIn Scraper, Patent Crawler, Conference Scout, Internal DB Auditor, Aggregator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { triggerExpertHunt } from '@/app/lib/n8n-bridge';
import { parseBody } from '@/lib/api-validate';
import { hunterTriggerProactiveBodySchema } from '@/lib/schemas/api';

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

  const parsed = parseBody(hunterTriggerProactiveBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { projectId, projectTitle, filterCriteria, query } = parsed.data;
  const projectIdStr = typeof projectId === 'string' && projectId.length > 0 ? projectId : undefined;

  const payload = {
    projectId: projectIdStr,
    projectTitle: projectTitle ?? undefined,
    filterCriteria: filterCriteria ?? {},
    query: query?.trim() ?? '',
  };

  const result = await triggerExpertHunt(payload);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'n8n Hunter trigger failed' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Hunter triggered. n8n will run LinkedIn, Patent, Conference, and Internal DB agents, then merge into Unified Expert Entity.',
    data: result.data,
  });
}
