/**
 * Seed expert_candidates from existing experts.
 * Creates one candidate per expert for identity disambiguation.
 * Run: npx tsx scripts/seed-expert-candidates.ts
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  const experts = await prisma.expert.findMany({
    select: {
      id: true,
      name: true,
      industry: true,
      subIndustry: true,
      country: true,
      currentEmployer: true,
      linkedinUrl: true,
    },
  });

  let created = 0;
  for (const e of experts) {
    const normalized = normalizeName(e.name);
    const existing = await prisma.expertCandidate.findFirst({
      where: { expertId: e.id },
    });
    if (existing) continue;

    await prisma.expertCandidate.create({
      data: {
        expertId: e.id,
        normalizedName: normalized,
        sourceType: 'manual',
        sourceUrl: e.linkedinUrl ?? undefined,
        headline: e.subIndustry,
        company: e.currentEmployer ?? e.industry,
        location: e.country,
        industry: e.industry,
        summary: `${e.name} - ${e.industry} / ${e.subIndustry}. ${e.country}.`,
        matchScore: 0.75,
        confidence: 0.7,
      },
    });
    created++;
    console.log('Created candidate for:', e.name);
  }

  console.log(`\nDone. Created ${created} expert candidates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
