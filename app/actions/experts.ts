'use server';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { generateEmbedding } from '@/lib/openai';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { encryptContactValue } from '@/lib/pii';
import { persistComplianceGuard } from '@/lib/compliance-guard';
import type { ContactType, VisibilityStatus } from '@prisma/client';

export type CreateExpertInput = {
  name: string;
  industry: string;
  subIndustry: string;
  country: string;
  region: string;
  currentEmployer?: string;
  seniorityScore: number;
  yearsExperience: number;
  predictedRate: number;
  contactCloaked?: boolean;
  visibilityStatus?: VisibilityStatus;
  contacts?: Array<{
    type: ContactType;
    value: string;
    isVerified?: boolean;
    source?: string;
  }>;
};

export async function createExpert(input: CreateExpertInput) {
  const ownerId = await getOrCreateCurrentUser();

  const embeddingText = `${input.industry} ${input.subIndustry}`.trim();
  const embedding = await generateEmbedding(embeddingText);

  const vectorStr = `[${embedding.join(',')}]`;

  const expert = await prisma.$transaction(async (tx) => {
    const expert = await tx.expert.create({
      data: {
        name: input.name,
        industry: input.industry,
        subIndustry: input.subIndustry,
        country: input.country,
        region: input.region,
        seniorityScore: input.seniorityScore,
        yearsExperience: input.yearsExperience,
        predictedRate: input.predictedRate,
        ownerId,
        visibilityStatus: input.visibilityStatus ?? 'PRIVATE',
      },
    });

    // Keep compatibility while some environments use a stale Prisma client.
    await tx.$executeRawUnsafe(
      `UPDATE "experts" SET "current_employer" = $1, "contact_cloaked" = $2 WHERE "id" = $3`,
      input.currentEmployer?.trim() || null,
      input.contactCloaked ?? false,
      expert.id
    );

    await tx.$executeRawUnsafe(
      `INSERT INTO expert_vectors (id, expert_id, embedding) VALUES ($1, $2, $3::vector)`,
      randomUUID(),
      expert.id,
      vectorStr
    );

    if (input.contacts?.length) {
      await tx.expertContact.createMany({
        data: input.contacts.map((c) => ({
          expertId: expert.id,
          type: c.type,
          value: encryptContactValue(c.value),
          isVerified: c.isVerified ?? false,
          source: c.source ?? null,
        })),
      });
    }

    return expert;
  });
  void persistComplianceGuard(expert.id).catch(() => undefined);

  revalidatePath('/');
  return expert;
}

export async function createExpertFromForm(formData: FormData) {
  await createExpert({
    name: (formData.get('name') as string)?.trim() ?? '',
    industry: (formData.get('industry') as string)?.trim() ?? '',
    subIndustry: (formData.get('subIndustry') as string)?.trim() ?? '',
    country: (formData.get('country') as string)?.trim() ?? '',
    region: (formData.get('region') as string)?.trim() ?? '',
    currentEmployer: (formData.get('currentEmployer') as string)?.trim() ?? '',
    seniorityScore: parseInt((formData.get('seniorityScore') as string) ?? '50', 10),
    yearsExperience: parseInt((formData.get('yearsExperience') as string) ?? '5', 10),
    predictedRate: parseFloat((formData.get('predictedRate') as string) ?? '200'),
    contactCloaked: (formData.get('contactCloaked') as string) === 'on',
    visibilityStatus: 'GLOBAL_POOL',
    contacts: (formData.get('email') as string)?.trim()
      ? [{ type: 'EMAIL' as const, value: (formData.get('email') as string).trim() }]
      : undefined,
  });
  redirect('/');
}

export type GetExpertsFilters = {
  ownerId?: string;
  industry?: string;
  visibilityStatus?: VisibilityStatus;
  limit?: number;
  offset?: number;
};

export async function getExperts(filters: GetExpertsFilters = {}) {
  await getOrCreateCurrentUser();

  const { ownerId, industry, visibilityStatus, limit = 50, offset = 0 } = filters;

  const experts = await prisma.expert.findMany({
    where: {
      ...(ownerId && { ownerId }),
      ...(industry && { industry }),
      ...(visibilityStatus && { visibilityStatus }),
    },
    include: {
      contacts: true,
    },
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
  });

  return experts;
}
