/**
 * Internal Reputation Score (Phase 9 – Intelligence Layer)
 * Weighted: Past Client Satisfaction 40%, Responsiveness 30%, Profile Completeness 20%, Global Pool 10%.
 */

import { prisma } from '@/lib/prisma';

const WEIGHT_SATISFACTION = 0.4;
const WEIGHT_RESPONSIVENESS = 0.3;
const WEIGHT_COMPLETENESS = 0.2;
const WEIGHT_GLOBAL_POOL = 0.1;

function profileCompletenessScore(expert: {
  name: string;
  industry: string;
  subIndustry: string;
  country: string;
  region: string;
  seniorityScore: number;
  yearsExperience: number;
  predictedRate: number;
  pastEmployers: unknown;
  skills: unknown;
  contacts?: { value: string }[];
}): number {
  const fields = [
    expert.name?.trim(),
    expert.industry?.trim(),
    expert.subIndustry?.trim(),
    expert.country?.trim(),
    expert.region?.trim(),
    expert.seniorityScore != null,
    expert.yearsExperience != null,
    expert.predictedRate != null && expert.predictedRate > 0,
    Array.isArray(expert.pastEmployers) && expert.pastEmployers.length > 0,
    Array.isArray(expert.skills) && expert.skills.length > 0,
    Array.isArray(expert.contacts) && expert.contacts.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return filled / fields.length;
}

/**
 * Compute reputation score for an expert (0–1).
 * Optionally persist to DB.
 */
export async function computeReputationScore(
  expertId: string,
  options: { persist?: boolean } = { persist: true }
): Promise<number> {
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    include: { tickets: true, contacts: true },
  });
  if (!expert) return 0;

  // Past Client Satisfaction (40%): RESOLVED or APPROVED / total tickets
  const totalTickets = expert.tickets.length;
  const resolvedOrApproved = expert.tickets.filter((t) =>
    ['RESOLVED', 'APPROVED'].includes(t.status)
  ).length;
  const satisfaction =
    totalTickets === 0 ? 1 : resolvedOrApproved / totalTickets;

  // Responsiveness / Completion Rate (30%): same proxy
  const responsiveness = satisfaction;

  // Profile Data Completeness (20%)
  const completeness = profileCompletenessScore({
    ...expert,
    contacts: expert.contacts,
  });

  // Global Pool History (10%): penalize if in global pool)
  const globalPoolPenalty = expert.visibilityStatus === 'GLOBAL_POOL' ? 0.5 : 1;

  const score =
    WEIGHT_SATISFACTION * satisfaction +
    WEIGHT_RESPONSIVENESS * responsiveness +
    WEIGHT_COMPLETENESS * completeness +
    WEIGHT_GLOBAL_POOL * globalPoolPenalty;

  const clamped = Math.max(0, Math.min(1, Math.round(score * 100) / 100));

  if (options.persist) {
    await prisma.expert.update({
      where: { id: expertId },
      data: { reputationScore: clamped },
    });
  }
  return clamped;
}
