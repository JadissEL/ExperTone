import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { canViewComplianceScore, getCurrentDbUser } from '@/lib/expert-access';
import { parseQuery } from '@/lib/api-validate';
import { expertsQuerySchema } from '@/lib/schemas/api';

const STALE_DAYS = 25;
const GLOBAL_POOL_BOOST = 0.15;
const HIGH_FEEDBACK_BOOST = 0.25;
const STALE_PENALTY = 0.3;

export interface ExpertRow {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  matchScore?: number;
  predictedRate: number;
  source: 'agent' | 'internal';
  visibilityStatus: string;
  reputationScore?: number | null;
  averageActualRate?: number | null;
  gapPercent?: number | null;
  hasProvenMastery?: boolean;
  reacquisitionPriority?: boolean;
  rankScore?: number;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const queryParsed = parseQuery(expertsQuerySchema, Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!queryParsed.success) return queryParsed.response;
  const { projectId, search: searchParam } = queryParsed.data;
  const search = searchParam?.trim().toLowerCase();
  const currentUser = await getCurrentDbUser();

  type ExpertData = {
    id: string;
    name: string;
    industry: string;
    subIndustry: string;
    country?: string;
    region?: string;
    seniorityScore?: number;
    yearsExperience?: number;
    predictedRate: number;
    visibilityStatus: string;
    matchScore?: number;
    reputationScore?: number | null;
    averageActualRate?: number | null;
    lastContactUpdate?: Date | null;
    subjectFrequencyMap?: unknown;
    industryTags?: unknown;
    reacquisitionPriority?: boolean;
    engagements?: { clientFeedbackScore: number }[];
    verifiedBadgeProvider?: string | null;
    verifiedAt?: Date | null;
    professionalAuthorityIndex?: number | null;
    complianceScore?: number | null;
    mnpiRiskLevel?: string | null;
  };

  let experts: ExpertData[];

  if (projectId && typeof projectId === 'string') {
    const project = await prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { creatorId: true },
    });
    const showCompliance = canViewComplianceScore({
      user: currentUser,
      projectCreatorId: project?.creatorId,
    });
    const results = await prisma.researchResult.findMany({
      where: { projectId },
      include: {
        expert: {
          include: { engagements: { select: { clientFeedbackScore: true } } },
        },
      },
      orderBy: { matchScore: 'desc' },
    });
    experts = results.map((r) => ({
      id: r.expert.id,
      name: r.expert.name,
      industry: r.expert.industry,
      subIndustry: r.expert.subIndustry,
      country: r.expert.country,
      region: r.expert.region,
      seniorityScore: r.expert.seniorityScore,
      yearsExperience: r.expert.yearsExperience,
      predictedRate: r.expert.predictedRate,
      visibilityStatus: r.expert.visibilityStatus,
      matchScore: r.matchScore,
      reputationScore: r.expert.reputationScore,
      averageActualRate: r.expert.averageActualRate,
      lastContactUpdate: r.expert.lastContactUpdate,
      subjectFrequencyMap: r.expert.subjectFrequencyMap,
      industryTags: r.expert.industryTags,
      reacquisitionPriority: r.expert.reacquisitionPriority ?? false,
      engagements: r.expert.engagements,
      verifiedBadgeProvider: r.expert.verifiedBadgeProvider ?? null,
      verifiedAt: r.expert.verifiedAt ?? null,
      professionalAuthorityIndex: r.expert.professionalAuthorityIndex ?? null,
      complianceScore: showCompliance ? r.expert.complianceScore : null,
      mnpiRiskLevel: showCompliance ? r.expert.mnpiRiskLevel : null,
    }));
  } else {
    const showCompliance = canViewComplianceScore({
      user: currentUser,
      projectCreatorId: undefined,
    });
    const list = await prisma.expert.findMany({
      where: { visibilityStatus: 'GLOBAL_POOL' },
      take: 100,
      include: { engagements: { select: { clientFeedbackScore: true } } },
    });
    experts = list.map((e) => ({
      id: e.id,
      name: e.name,
      industry: e.industry,
      subIndustry: e.subIndustry,
      predictedRate: e.predictedRate,
      visibilityStatus: e.visibilityStatus,
      reputationScore: e.reputationScore,
      averageActualRate: e.averageActualRate,
      lastContactUpdate: e.lastContactUpdate,
      subjectFrequencyMap: e.subjectFrequencyMap,
      industryTags: e.industryTags,
      reacquisitionPriority: e.reacquisitionPriority ?? false,
      engagements: e.engagements,
      verifiedBadgeProvider: e.verifiedBadgeProvider ?? null,
      verifiedAt: e.verifiedAt ?? null,
      professionalAuthorityIndex: e.professionalAuthorityIndex ?? null,
      complianceScore: showCompliance ? e.complianceScore : null,
      mnpiRiskLevel: showCompliance ? e.mnpiRiskLevel : null,
    }));
  }

  const now = Date.now();
  const staleThreshold = new Date(now - STALE_DAYS * 24 * 60 * 60 * 1000);

  const rows: ExpertRow[] = experts.map((e) => {
    const baseScore = e.matchScore ?? 1;
    let rankMultiplier = 1;
    if (e.visibilityStatus === 'GLOBAL_POOL') rankMultiplier += GLOBAL_POOL_BOOST;
    const avgFeedback =
      e.engagements?.length &&
      e.engagements.reduce((s, x) => s + x.clientFeedbackScore, 0) / e.engagements.length;
    if (avgFeedback != null && avgFeedback > 4.5) rankMultiplier += HIGH_FEEDBACK_BOOST;
    if (e.lastContactUpdate && e.lastContactUpdate < staleThreshold) rankMultiplier -= STALE_PENALTY;
    const rankScore = Math.max(0, baseScore * rankMultiplier);

    const industryTagsArr: string[] = Array.isArray(e.industryTags)
      ? (e.industryTags as string[]).map((x) => String(x).toLowerCase())
      : [];
    const subjectMap = (e.subjectFrequencyMap as Record<string, number>) || {};
    const subjectKeys = Object.keys(subjectMap).map((k) => k.toLowerCase());
    const tagsToMatch = industryTagsArr.length ? industryTagsArr : [e.industry.toLowerCase(), e.subIndustry.toLowerCase()];
    const hasProvenMastery =
      tagsToMatch.some((t) => subjectKeys.some((s) => s.includes(t) || t.includes(s)));

    const gapPercent =
      e.averageActualRate != null && e.predictedRate > 0
        ? Math.abs((e.averageActualRate - e.predictedRate) / e.predictedRate) * 100
        : null;

    return {
      id: e.id,
      name: e.name,
      industry: e.industry,
      subIndustry: e.subIndustry,
      country: e.country,
      region: e.region,
      seniorityScore: e.seniorityScore,
      yearsExperience: e.yearsExperience,
      matchScore: e.matchScore,
      predictedRate: e.predictedRate,
      source: projectId && e.matchScore !== undefined ? 'agent' : 'internal',
      visibilityStatus: e.visibilityStatus,
      reputationScore: e.reputationScore,
      averageActualRate: e.averageActualRate ?? null,
      gapPercent: gapPercent ?? null,
      hasProvenMastery: !!hasProvenMastery,
      reacquisitionPriority: e.reacquisitionPriority ?? false,
      rankScore,
      verifiedBadgeProvider: e.verifiedBadgeProvider ?? null,
      verifiedAt: e.verifiedAt ?? null,
      professionalAuthorityIndex: e.professionalAuthorityIndex ?? null,
      complianceScore: e.complianceScore ?? null,
      mnpiRiskLevel: e.mnpiRiskLevel ?? null,
    };
  });

  rows.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));

  const filtered = search
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.industry.toLowerCase().includes(search) ||
          r.subIndustry.toLowerCase().includes(search)
      )
    : rows;

  return NextResponse.json({ experts: filtered });
}
