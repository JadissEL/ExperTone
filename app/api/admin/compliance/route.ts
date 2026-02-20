import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { prisma } from '@/lib/prisma';

/**
 * Admin: List experts with compliance and trust data.
 * Query: page, limit, complianceMin, complianceMax, mnpiRisk, hasVerifiedBadge
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10)));
  const complianceMin = req.nextUrl.searchParams.get('complianceMin');
  const complianceMax = req.nextUrl.searchParams.get('complianceMax');
  const mnpiRisk = req.nextUrl.searchParams.get('mnpiRisk')?.trim();
  const hasVerifiedBadge = req.nextUrl.searchParams.get('hasVerifiedBadge');
  const search = req.nextUrl.searchParams.get('search')?.trim().toLowerCase();

  const and: Record<string, unknown>[] = [];

  const complianceScore: { gte?: number; lte?: number } = {};
  if (complianceMin != null && complianceMin !== '') {
    const min = parseInt(complianceMin, 10);
    if (!isNaN(min)) complianceScore.gte = min;
  }
  if (complianceMax != null && complianceMax !== '') {
    const max = parseInt(complianceMax, 10);
    if (!isNaN(max)) complianceScore.lte = max;
  }
  if (Object.keys(complianceScore).length > 0) and.push({ complianceScore });

  if (mnpiRisk) and.push({ mnpiRiskLevel: mnpiRisk });
  if (hasVerifiedBadge === 'true') and.push({ verifiedBadgeProvider: { not: null } });
  if (hasVerifiedBadge === 'false') and.push({ OR: [{ verifiedBadgeProvider: null }, { verifiedBadgeProvider: '' }] });
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
        { subIndustry: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  const where = and.length > 0 ? { AND: and } : {};

  const [experts, total] = await Promise.all([
    prisma.expert.findMany({
      where,
      select: {
        id: true,
        name: true,
        industry: true,
        subIndustry: true,
        currentEmployer: true,
        complianceScore: true,
        mnpiRiskLevel: true,
        verifiedBadgeProvider: true,
        verifiedAt: true,
        citationCount: true,
        patentCount: true,
        professionalAuthorityIndex: true,
        contactCloaked: true,
      },
      orderBy: [{ complianceScore: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expert.count({ where }),
  ]);

  const serialized = experts.map((e) => ({
    ...e,
    verifiedAt: e.verifiedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    experts: serialized,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
