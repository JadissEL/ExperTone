import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { canRevealCloakedContacts, canViewComplianceScore, getCurrentDbUser, maskContactValue } from '@/lib/expert-access';
import { parseParams } from '@/lib/api-validate';
import { projectIdParamsSchema } from '@/lib/schemas/api';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const awaitedParams = await params;
  const paramsParsed = parseParams(projectIdParamsSchema, awaitedParams);
  if (!paramsParsed.success) return paramsParsed.response;
  const { id } = paramsParsed.data;
  const currentUser = await getCurrentDbUser();
  const project = await prisma.researchProject.findUnique({
    where: { id },
    include: {
      results: {
        include: { expert: { include: { contacts: true } } },
        orderBy: { matchScore: 'desc' },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const showCompliance = canViewComplianceScore({
    user: currentUser,
    projectCreatorId: project.creatorId,
  });

  const results = await Promise.all(project.results.map(async (r) => {
    const expert = r.expert as typeof r.expert & {
      pastEmployers?: unknown;
      skills?: unknown;
      owner?: { id: string; email: string };
      contactCloaked?: boolean;
      verifiedBadgeProvider?: string | null;
      verifiedAt?: Date | null;
      citationCount?: number | null;
      patentCount?: number | null;
      professionalAuthorityIndex?: number | null;
      complianceScore?: number | null;
      mnpiRiskLevel?: string | null;
    };
    const canReveal = !expert.contactCloaked
      ? true
      : currentUser
        ? await canRevealCloakedContacts({
            userId: currentUser.id,
            expertId: expert.id,
            projectId: project.id,
          })
        : false;
    const contacts = canReveal
      ? expert.contacts
      : expert.contacts.map((c) => ({ ...c, value: maskContactValue(c.value) }));
    if (canReveal && contacts.length > 0) {
      void prisma.$executeRawUnsafe(
        `INSERT INTO "contact_attempts" ("id", "expert_id", "created_at") VALUES ($1, $2, NOW())`,
        randomUUID(),
        expert.id
      ).catch(() => undefined);
    }
    return {
      id: expert.id,
      name: expert.name,
      industry: expert.industry,
      subIndustry: expert.subIndustry,
      country: expert.country,
      region: expert.region,
      seniorityScore: expert.seniorityScore,
      yearsExperience: expert.yearsExperience,
      predictedRate: expert.predictedRate,
      visibilityStatus: expert.visibilityStatus,
      verifiedBadgeProvider: expert.verifiedBadgeProvider ?? null,
      verifiedAt: expert.verifiedAt ?? null,
      citationCount: expert.citationCount ?? 0,
      patentCount: expert.patentCount ?? 0,
      professionalAuthorityIndex: expert.professionalAuthorityIndex ?? null,
      complianceScore: showCompliance ? expert.complianceScore ?? null : null,
      mnpiRiskLevel: showCompliance ? expert.mnpiRiskLevel ?? null : null,
      requiresManualScreening: (expert.mnpiRiskLevel ?? null) === 'HIGH_RISK_MNPI',
      contactCloaked: expert.contactCloaked ?? false,
      contactRevealGranted: canReveal,
      pastEmployers: expert.pastEmployers,
      skills: expert.skills,
      contacts,
      ownerId: expert.ownerId,
      ownerName: expert.owner?.email ?? null,
      matchScore: r.matchScore,
      classificationTier: r.classificationTier,
      expert: {
        ...expert,
        contacts,
        pastEmployers: expert.pastEmployers,
        skills: expert.skills,
      },
    };
  }));

  return NextResponse.json({
    projectId: project.id,
    status: project.status,
    results,
  });
}
