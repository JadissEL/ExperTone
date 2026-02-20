import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';

const GAP_THRESHOLD = 5;

export interface LiquiditySegment {
  industry: string;
  subIndustry: string;
  region: string;
  label: string;
  demandCount: number;
  supplyCount: number;
  gap: boolean;
}

/**
 * Market Liquidity: Active Research Projects (demand) vs Available Experts (supply).
 * Returns segments and gap alerts (supply < GAP_THRESHOLD).
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const activeProjects = await prisma.researchProject.findMany({
    where: { status: { in: ['PENDING', 'RUNNING'] } },
    select: { id: true, title: true, filterCriteria: true },
  });

  const segments: LiquiditySegment[] = [];
  const seen = new Set<string>();

  for (const p of activeProjects) {
    const criteria = (p.filterCriteria as Record<string, unknown>) || {};
    const industry = (criteria.industry as string) || '';
    const subIndustry = (criteria.subIndustry as string) || (criteria.sub_industry as string) || '';
    const region = (criteria.regions as string[])?.[0] || (criteria.region as string) || '';

    const key = `${industry}|${subIndustry}|${region}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const supplyCount = await prisma.expert.count({
      where: {
        visibilityStatus: 'GLOBAL_POOL',
        ...(industry && { industry: { contains: industry, mode: 'insensitive' } }),
        ...(subIndustry && { subIndustry: { contains: subIndustry, mode: 'insensitive' } }),
        ...(region && { region: { contains: region, mode: 'insensitive' } }),
      },
    });

    const label = [industry || 'Any', subIndustry || 'Any', region || 'Any'].filter(Boolean).join(' · ');
    segments.push({
      industry,
      subIndustry,
      region,
      label,
      demandCount: 1,
      supplyCount,
      gap: supplyCount < GAP_THRESHOLD,
    });
  }

  const byKey = new Map<string, LiquiditySegment>();
  for (const s of segments) {
    const key = `${s.industry}|${s.subIndustry}|${s.region}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.demandCount += 1;
    } else {
      byKey.set(key, { ...s });
    }
  }

  const list = Array.from(byKey.values());
  const gaps = list.filter((s) => s.gap);

  return NextResponse.json({
    segments: list,
    gaps,
    gapThreshold: GAP_THRESHOLD,
  });
}
