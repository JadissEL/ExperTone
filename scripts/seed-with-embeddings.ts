/**
 * Seed experts with embeddings for Hunter Search.
 * Run: npx tsx scripts/seed-with-embeddings.ts
 * Requires: XAI_API_KEY or OPENAI_API_KEY, DATABASE_URL
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { generateEmbedding } from '../lib/openai';

const PAST_DAYS = 35;

const SEED_EXPERTS = [
  { name: 'Dr. Sarah Chen', industry: 'Technology', subIndustry: 'Semiconductors' },
  { name: 'James Okonkwo', industry: 'Healthcare', subIndustry: 'Pharma' },
  { name: 'Marie Dubois', industry: 'Finance', subIndustry: 'Asset Management' },
  { name: 'Yuki Tanaka', industry: 'Energy', subIndustry: 'Renewables' },
  { name: 'Hans Mueller', industry: 'Retail', subIndustry: 'E-commerce' },
  { name: 'Elena Rodriguez', industry: 'Technology', subIndustry: 'AI/ML' },
  { name: 'Marcus Johnson', industry: 'Healthcare', subIndustry: 'Biotech' },
  { name: 'Sophie Laurent', industry: 'Finance', subIndustry: 'Fintech' },
];

async function main() {
  const past = new Date();
  past.setDate(past.getDate() - PAST_DAYS);

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'seed-owner@example.com',
        role: 'CSA',
      },
    });
    console.log('Created seed user:', user.email);
  }

  const existing = await prisma.expert.count();
  if (existing > 0) {
    console.log(`Found ${existing} existing experts. Adding embeddings for experts without vectors...`);
    const expertsWithoutVectors = await prisma.expert.findMany({
      where: { vector: null },
      select: { id: true, name: true, industry: true, subIndustry: true },
    });
    for (const e of expertsWithoutVectors) {
      const text = `${e.name} ${e.industry} ${e.subIndustry}`.trim();
      const embedding = await generateEmbedding(text.slice(0, 8000));
      const vectorStr = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO expert_vectors (id, expert_id, embedding) VALUES ($1, $2, $3::vector)`,
        randomUUID(),
        e.id,
        vectorStr
      );
      console.log('  Added embedding for:', e.name);
    }
    console.log('Done.');
    return;
  }

  for (let i = 0; i < SEED_EXPERTS.length; i++) {
    const item = SEED_EXPERTS[i];
    if (!item) continue;
    const embeddingText = `${item.name} ${item.industry} ${item.subIndustry}`.trim();
    const embedding = await generateEmbedding(embeddingText.slice(0, 8000));
    const vectorStr = `[${embedding.join(',')}]`;

    const expert = await prisma.expert.create({
      data: {
        name: item.name,
        industry: item.industry,
        subIndustry: item.subIndustry,
        country: 'United States',
        region: 'North America',
        seniorityScore: 50 + (i % 5) * 10,
        yearsExperience: 5 + (i % 3),
        predictedRate: 150 + i * 25,
        ownerId: user.id,
        visibilityStatus: 'PRIVATE',
        privateExpiresAt: past,
        lastContactUpdate: past,
        totalEngagements: 0,
      },
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO expert_vectors (id, expert_id, embedding) VALUES ($1, $2, $3::vector)`,
      randomUUID(),
      expert.id,
      vectorStr
    );
    console.log('Created:', expert.name);
  }

  console.log(`\nDone. ${SEED_EXPERTS.length} experts with embeddings. Hunter Search should now return results.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
