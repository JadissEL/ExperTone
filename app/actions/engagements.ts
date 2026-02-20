'use server';

import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { computeReputationScore } from '@/lib/reputation';
import { encryptNumeric } from '@/lib/pii';
import { revalidatePath } from 'next/cache';

export type LogEngagementInput = {
  expertId: string;
  projectId: string;
  subjectMatter: string;
  actualCost: number;
  clientFeedbackScore: number; // 1-5
  date?: Date;
  durationMinutes: number;
};

/**
 * Knowledge Loop: record a completed call/project, update expert aggregates, and re-trigger reputation.
 */
export async function logExpertEngagement(input: LogEngagementInput) {
  await getOrCreateCurrentUser();

  const date = input.date ? new Date(input.date) : new Date();
  const subjectMatter = (input.subjectMatter || '').trim();
  if (!subjectMatter) throw new Error('subjectMatter is required');
  if (input.clientFeedbackScore < 1 || input.clientFeedbackScore > 5) {
    throw new Error('clientFeedbackScore must be 1-5');
  }

  const actualCostEncrypted = encryptNumeric(input.actualCost) ?? undefined;
  const engagement = await prisma.$transaction(async (tx) => {
    const e = await tx.engagement.create({
      data: {
        expertId: input.expertId,
        projectId: input.projectId,
        subjectMatter,
        actualCost: input.actualCost,
        ...(actualCostEncrypted != null && { actualCostEncrypted }),
        clientFeedbackScore: input.clientFeedbackScore,
        date,
        durationMinutes: input.durationMinutes,
      },
    });

    const expert = await tx.expert.findUnique({
      where: { id: input.expertId },
      include: { engagements: true },
    });
    if (!expert) throw new Error('Expert not found');

    const engagements = expert.engagements.length; // includes the one we just created
    const totalCost = expert.engagements.reduce((s, x) => s + x.actualCost, 0);
    const averageActualRate = totalCost / engagements;

    const currentMap = (expert.subjectFrequencyMap as Record<string, number>) || {};
    const updatedMap = { ...currentMap, [subjectMatter]: (currentMap[subjectMatter] || 0) + 1 };

    await tx.expert.update({
      where: { id: input.expertId },
      data: {
        totalEngagements: engagements,
        averageActualRate,
        subjectFrequencyMap: updatedMap,
        reliabilityIndex: 1.0, // completion vs cancellation: every logged engagement is a completion
      },
    });

    return e;
  });

  await computeReputationScore(input.expertId, { persist: true });
  revalidatePath('/dashboard');
  revalidatePath('/');

  return { id: engagement.id };
}
