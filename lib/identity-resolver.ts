/**
 * Identity Resolution Service
 * Resolves expert by name; returns disambiguation candidates when multiple people match.
 */

import { prisma } from '@/lib/prisma';

const AUTO_RESOLVE_THRESHOLD = 0.85;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export type ResolveResult =
  | { resolved: true; expert: { id: string; name: string; [k: string]: unknown } }
  | {
      resolved: false;
      candidates: Array<{
        id: string;
        expertId: string;
        photoUrl: string | null;
        headline: string;
        company: string;
        location: string;
        industry: string;
        education: string;
        summary: string;
        matchScore: number;
        confidence: number;
      }>;
    };

export async function resolveByName(
  name: string,
  context?: { projectId?: string; matchScore?: number }
): Promise<ResolveResult> {
  const normalized = normalizeName(name);
  if (!normalized) {
    return { resolved: false, candidates: [] };
  }

  // 1. Check expert_candidates for multiple identities
  const candidates = await prisma.expertCandidate.findMany({
    where: { normalizedName: normalized },
    include: { expert: true },
    orderBy: [{ confidence: 'desc' }, { retrievedAt: 'desc' }],
  });

  if (candidates.length === 0) {
    // 2. Fallback: find expert by name in experts table
    const experts = await prisma.expert.findMany({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
      take: 1,
    });
    const expert = experts[0];
    if (expert) {
      return {
        resolved: true,
        expert: {
          id: expert.id,
          name: expert.name,
          industry: expert.industry,
          subIndustry: expert.subIndustry,
          country: expert.country,
        },
      };
    }
    return { resolved: false, candidates: [] };
  }

  if (candidates.length === 1 && candidates[0].confidence >= AUTO_RESOLVE_THRESHOLD) {
    const c = candidates[0];
    return {
      resolved: true,
      expert: {
        id: c.expert.id,
        name: c.expert.name,
        industry: c.expert.industry,
        subIndustry: c.expert.subIndustry,
        country: c.expert.country,
      },
    };
  }

  // 3. Rank candidates for disambiguation
  const ranked = rankCandidates(candidates, context);
  return {
    resolved: false,
    candidates: ranked.map((c) => ({
      id: c.id,
      expertId: c.expertId,
      photoUrl: c.photoUrl,
      headline: c.headline ?? c.expert.subIndustry ?? '—',
      company: c.company ?? c.expert.currentEmployer ?? '—',
      location: c.location ?? `${c.expert.country}`,
      industry: c.industry ?? c.expert.industry,
      education: c.education ?? '—',
      summary: c.summary ?? 'Limited data available.',
      matchScore: context?.matchScore ?? c.matchScore,
      confidence: c.confidence,
    })),
  };
}

function rankCandidates(
  candidates: Array<{
    id: string;
    expertId: string;
    matchScore: number;
    confidence: number;
    photoUrl: string | null;
    headline: string | null;
    company: string | null;
    location: string | null;
    industry: string | null;
    education: string | null;
    summary: string | null;
    expert: { currentEmployer: string | null };
  }>,
  context?: { projectId?: string; matchScore?: number }
): typeof candidates {
  return [...candidates].sort((a, b) => {
    const scoreA = (context?.matchScore ?? a.matchScore) * 0.5 + a.confidence * 0.5;
    const scoreB = (context?.matchScore ?? b.matchScore) * 0.5 + b.confidence * 0.5;
    return scoreB - scoreA;
  });
}
