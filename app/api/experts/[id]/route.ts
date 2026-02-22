import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { computeReputationScore } from '@/lib/reputation';
import { decryptContacts, decryptNumeric } from '@/lib/pii';
import { canRevealCloakedContacts, canViewComplianceScore, getCurrentDbUser, maskContactValue } from '@/lib/expert-access';
import { parseParams, parseQuery } from '@/lib/api-validate';
import { expertIdParamsSchema, expertIdQuerySchema } from '@/lib/schemas/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const awaitedParams = await params;
  const paramsParsed = parseParams(expertIdParamsSchema, awaitedParams);
  if (!paramsParsed.success) return paramsParsed.response;
  const { id } = paramsParsed.data;

  const queryParsed = parseQuery(expertIdQuerySchema, Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!queryParsed.success) return queryParsed.response;
  const { projectId: rawProjectId } = queryParsed.data;
  const projectId = typeof rawProjectId === 'string' && rawProjectId.length > 0 ? rawProjectId : undefined;
  const currentUser = await getCurrentDbUser();
  const project = projectId
    ? await prisma.researchProject.findUnique({
        where: { id: projectId },
        select: { creatorId: true },
      })
    : null;
  const expert = await prisma.expert.findUnique({
    where: { id },
    include: {
      contacts: true,
      engagements: { orderBy: { date: 'desc' }, take: 20 },
    },
  });

  if (!expert) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }
  const expertData = expert as typeof expert & {
    contactCloaked?: boolean;
    verifiedBadgeProvider?: string | null;
    verifiedAt?: Date | null;
    citationCount?: number | null;
    patentCount?: number | null;
    professionalAuthorityIndex?: number | null;
    complianceScore?: number | null;
    mnpiRiskLevel?: string | null;
  };

  // Lazy-update reputation if never computed
  let reputationScore = expert.reputationScore;
  if (reputationScore == null) {
    reputationScore = await computeReputationScore(id, { persist: true });
  }

  const contacts = decryptContacts(expert.contacts).map((c) => ({
    type: c.type,
    value: c.value,
    isVerified: c.isVerified,
  }));

  let revealContacts = true;
  if (expertData.contactCloaked && currentUser) {
    revealContacts = await canRevealCloakedContacts({
      userId: currentUser.id,
      expertId: expertData.id,
      projectId,
    });
  }

  const safeContacts = revealContacts
    ? contacts
    : contacts.map((c) => ({ ...c, value: maskContactValue(c.value), isVerified: false }));
  if (revealContacts && contacts.length > 0) {
    void prisma.$executeRawUnsafe(
      `INSERT INTO "contact_attempts" ("id", "expert_id", "created_at") VALUES ($1, $2, NOW())`,
      randomUUID(),
      expertData.id
    ).catch(() => undefined);
  }

  const engagements = expert.engagements?.map((e) => ({
    id: e.id,
    subjectMatter: e.subjectMatter,
    actualCost: (e.actualCostEncrypted != null ? decryptNumeric(e.actualCostEncrypted) : null) ?? e.actualCost,
    clientFeedbackScore: e.clientFeedbackScore,
    date: e.date.toISOString(),
    durationMinutes: e.durationMinutes,
  })) ?? [];

  return NextResponse.json({
    id: expert.id,
    name: expert.name,
    industry: expert.industry,
    subIndustry: expert.subIndustry,
    country: expert.country,
    region: expert.region,
    seniorityScore: expert.seniorityScore,
    yearsExperience: expert.yearsExperience,
    predictedRate: expert.predictedRate,
    predictedRateRange: (expert as { predictedRateRange?: unknown }).predictedRateRange ?? null,
    reputationScore,
    visibilityStatus: expert.visibilityStatus,
    pastEmployers: (expert as { pastEmployers?: unknown }).pastEmployers,
    skills: (expert as { skills?: unknown }).skills,
    contacts: safeContacts,
    totalEngagements: expert.totalEngagements ?? 0,
    averageActualRate: expert.averageActualRate ?? null,
    subjectFrequencyMap: (expert as { subjectFrequencyMap?: Record<string, number> }).subjectFrequencyMap ?? null,
    reliabilityIndex: expert.reliabilityIndex ?? null,
    verifiedBadgeProvider: expertData.verifiedBadgeProvider ?? null,
    verifiedAt: expertData.verifiedAt?.toISOString() ?? null,
    citationCount: expertData.citationCount ?? 0,
    patentCount: expertData.patentCount ?? 0,
    professionalAuthorityIndex: expertData.professionalAuthorityIndex ?? null,
    complianceScore: canViewComplianceScore({ user: currentUser, projectCreatorId: project?.creatorId })
      ? expertData.complianceScore
      : null,
    mnpiRiskLevel: canViewComplianceScore({ user: currentUser, projectCreatorId: project?.creatorId })
      ? expertData.mnpiRiskLevel
      : null,
    requiresManualScreening: expertData.mnpiRiskLevel === 'HIGH_RISK_MNPI',
    contactCloaked: expertData.contactCloaked ?? false,
    contactRevealGranted: revealContacts,
    sourceVerified: expert.sourceVerified ?? null,
    engagements,
  });
}
