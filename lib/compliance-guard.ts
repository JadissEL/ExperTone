import { prisma } from '@/lib/prisma';

type JsonStringArray = unknown;

export type ComplianceScanResult = {
  score: number;
  mnpiRiskLevel: 'HIGH_RISK_MNPI' | 'MEDIUM_RISK_MNPI' | 'LOW_RISK_MNPI' | null;
  requiresManualScreening: boolean;
  flags: string[];
};

function asStringArray(value: JsonStringArray): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesNormalized(haystack: string, needle: string): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  return !!n && (h.includes(n) || n.includes(h));
}

function detectMnpiRisk(text: string): ComplianceScanResult['mnpiRiskLevel'] {
  const t = normalize(text);
  const highRiskPatterns = [
    /clinical trial/,
    /trial lead/,
    /drug safety/,
    /regulatory approval/,
    /m[& ]a/,
    /earnings/,
    /investor relations/,
    /inside information/,
    /confidential pipeline/,
  ];
  if (highRiskPatterns.some((p) => p.test(t))) return 'HIGH_RISK_MNPI';

  const mediumRiskPatterns = [/strategy/, /roadmap/, /pricing committee/, /finance leadership/];
  if (mediumRiskPatterns.some((p) => p.test(t))) return 'MEDIUM_RISK_MNPI';

  return null;
}

export function computeProfessionalAuthorityIndex(
  citationCount: number | null | undefined,
  patentCount: number | null | undefined
): number {
  const citations = Math.max(0, citationCount ?? 0);
  const patents = Math.max(0, patentCount ?? 0);
  // Log-scaled index to avoid outsized domination by very large counts.
  const citationComponent = Math.log10(citations + 1) * 60;
  const patentComponent = Math.log10(patents + 1) * 40;
  return Math.round((citationComponent + patentComponent) * 100) / 100;
}

export async function runComplianceGuard(
  expertId: string,
  projectId?: string
): Promise<ComplianceScanResult> {
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: {
      id: true,
      name: true,
      industry: true,
      subIndustry: true,
      currentEmployer: true,
      skills: true,
    },
  });
  if (!expert) {
    throw new Error('Expert not found');
  }

  const project = projectId
    ? await prisma.researchProject.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          clientBlacklist: true,
          restrictedIndustries: true,
        },
      })
    : null;

  const blacklist = asStringArray(project?.clientBlacklist);
  const restrictedIndustries = asStringArray(project?.restrictedIndustries);

  const employer = expert.currentEmployer ?? '';
  const roleBlob = [expert.industry, expert.subIndustry, ...asStringArray(expert.skills)].join(' ');
  const mnpiRiskLevel = detectMnpiRisk(roleBlob);

  let score = 100;
  const flags: string[] = [];

  const hasBlacklistMatch =
    !!employer && blacklist.some((entry) => includesNormalized(employer, entry));
  if (hasBlacklistMatch) {
    score -= 55;
    flags.push('BLACKLIST_MATCH');
  }

  const hasRestrictedIndustryMatch = restrictedIndustries.some((entry) =>
    includesNormalized(`${expert.industry} ${expert.subIndustry}`, entry)
  );
  if (hasRestrictedIndustryMatch) {
    score -= 25;
    flags.push('RESTRICTED_INDUSTRY_MATCH');
  }

  if (mnpiRiskLevel === 'HIGH_RISK_MNPI') {
    score -= 30;
    flags.push('HIGH_RISK_MNPI');
  } else if (mnpiRiskLevel === 'MEDIUM_RISK_MNPI') {
    score -= 15;
    flags.push('MEDIUM_RISK_MNPI');
  }

  score = Math.min(100, Math.max(1, score));
  const requiresManualScreening = mnpiRiskLevel === 'HIGH_RISK_MNPI';

  return {
    score,
    mnpiRiskLevel,
    requiresManualScreening,
    flags,
  };
}

export async function persistComplianceGuard(
  expertId: string,
  projectId?: string
): Promise<ComplianceScanResult> {
  const result = await runComplianceGuard(expertId, projectId);
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { citationCount: true, patentCount: true },
  });
  if (!expert) throw new Error('Expert not found');

  const authority = computeProfessionalAuthorityIndex(expert.citationCount, expert.patentCount);

  await prisma.expert.update({
    where: { id: expertId },
    data: {
      complianceScore: result.score,
      mnpiRiskLevel: result.mnpiRiskLevel,
      professionalAuthorityIndex: authority,
    },
  });

  return result;
}
