import { NextRequest, NextResponse } from 'next/server';
import { triggerResearchProject } from '@/lib/dispatch';
import { parseBody } from '@/lib/api-validate';
import { researchTriggerBodySchema } from '@/lib/schemas/api';

/**
 * Research trigger - uses unified Dispatch gateway.
 * On n8n failure: returns scrapingStarted: false, project still created (Database Only fallback).
 */
export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = parseBody(researchTriggerBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { projectTitle, filters, clientBlacklist, restrictedIndustries } = parsed.data;

  const result = await triggerResearchProject({
    title: projectTitle?.trim() ?? 'Research',
    filterCriteria: filters ?? {},
    clientBlacklist: clientBlacklist ?? [],
    restrictedIndustries: restrictedIndustries ?? [],
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, projectId: result.projectId },
      { status: 400 }
    );
  }

  return NextResponse.json({
    projectId: result.projectId,
    projectTitle: result.projectTitle,
    status: result.status,
    scrapingStarted: result.scrapingStarted,
    scrapingError: !result.scrapingStarted
      ? 'Scraping service unavailable. Using Database Only results.'
      : undefined,
  });
}
