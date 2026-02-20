import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { triggerResearchProject } from '@/lib/dispatch';

/**
 * Trigger n8n Deep Scrape for a specific niche (gap replenishment).
 * Body: { industry?, subIndustry?, region?, title? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  let body: { industry?: string; subIndustry?: string; region?: string; title?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = (body.title as string)?.trim() || `Replenish: ${body.industry || ''} ${body.subIndustry || ''} ${body.region || ''}`.trim() || 'Deep Scrape';
  const result = await triggerResearchProject({
    title: title.slice(0, 100),
    filterCriteria: {
      industry: body.industry ?? '',
      subIndustry: body.subIndustry ?? '',
      sub_industry: body.subIndustry ?? '',
      region: body.region ?? '',
      regions: body.region ? [body.region] : [],
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    projectId: result.projectId,
    scrapingStarted: result.scrapingStarted,
    message: 'Deep Scrape triggered for niche replenishment.',
  });
}
