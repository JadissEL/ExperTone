/**
 * Seed experts with embeddings for Hunter Search.
 * Run: npx tsx scripts/seed-with-embeddings.ts
 * Run: npx tsx scripts/seed-with-embeddings.ts --expand   # add 95 more experts (total 100)
 * Requires: OPENROUTER_API_KEY (or OPENAI/XAI), DATABASE_URL
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

/** Generate 100+ experts for Hunter Search. Industries aligned with SMRs, data centers, nuclear. */
const INDUSTRIES = [
  { industry: 'Energy', subIndustry: 'Nuclear' },
  { industry: 'Energy', subIndustry: 'SMR' },
  { industry: 'Technology', subIndustry: 'Data Centers' },
  { industry: 'Technology', subIndustry: 'Liquid Cooling' },
  { industry: 'Technology', subIndustry: 'Semiconductors' },
  { industry: 'Technology', subIndustry: 'AI/ML' },
  { industry: 'Finance', subIndustry: 'Asset Management' },
  { industry: 'Finance', subIndustry: 'Fintech' },
  { industry: 'Healthcare', subIndustry: 'Pharma' },
  { industry: 'Healthcare', subIndustry: 'Biotech' },
  { industry: 'Retail', subIndustry: 'E-commerce' },
  { industry: 'Energy', subIndustry: 'Renewables' },
  { industry: 'Manufacturing', subIndustry: 'Industrial' },
  { industry: 'Consulting', subIndustry: 'Strategy' },
];
const FIRST_NAMES = ['Sarah', 'James', 'Marie', 'Yuki', 'Hans', 'Elena', 'Marcus', 'Sophie', 'David', 'Anna', 'Michael', 'Lisa', 'Robert', 'Jennifer', 'Thomas'];
const LAST_NAMES = ['Chen', 'Okonkwo', 'Dubois', 'Tanaka', 'Mueller', 'Rodriguez', 'Johnson', 'Laurent', 'Kim', 'Patel', 'Schmidt', 'Williams', 'Garcia', 'Brown', 'Davis'];

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

  const expand = process.argv.includes('--expand');
  const existing = await prisma.expert.count();

  if (existing > 0 && !expand) {
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

  if (existing > 0 && expand) {
    const toAdd = Math.max(0, 100 - existing);
    if (toAdd === 0) {
      console.log(`Already have ${existing} experts. Nothing to add.`);
      return;
    }
    console.log(`Found ${existing} experts. Adding ${toAdd} more to reach 100...`);
    const toCreate: { name: string; industry: string; subIndustry: string }[] = [];
    const seenNames = new Set<string>();
    const existingExperts = await prisma.expert.findMany({ select: { name: true } });
    for (const e of existingExperts) seenNames.add(e.name.toLowerCase().replace(/\s+/g, ' ').trim());

    while (toCreate.length < toAdd) {
      const ind = INDUSTRIES[toCreate.length % INDUSTRIES.length]!;
      const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]!;
      const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]!;
      const name = `${fn} ${ln}`;
      const nameKey = name.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        toCreate.push({ name, industry: ind.industry, subIndustry: ind.subIndustry });
      }
    }

    for (let i = 0; i < toCreate.length; i++) {
      const item = toCreate[i]!;
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
      console.log('Added:', expert.name);
    }
    console.log(`\nDone. Added ${toCreate.length} experts. Total: ${existing + toCreate.length}.`);
    return;
  }

  // Build list of 100+ experts: original 8 + generated (unique names only)
  const toCreate: { name: string; industry: string; subIndustry: string }[] = [...SEED_EXPERTS];
  const seenNames = new Set<string>();
  for (const item of SEED_EXPERTS) seenNames.add(item.name.toLowerCase().replace(/\s+/g, ' ').trim());

  while (toCreate.length < 100) {
    const ind = INDUSTRIES[toCreate.length % INDUSTRIES.length]!;
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]!;
    const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]!;
    const name = `${fn} ${ln}`;
    const nameKey = name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seenNames.has(nameKey)) {
      seenNames.add(nameKey);
      toCreate.push({ name, industry: ind.industry, subIndustry: ind.subIndustry });
    }
  }

  for (let i = 0; i < toCreate.length; i++) {
    const item = toCreate[i];
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

  console.log(`\nDone. ${toCreate.length} experts with embeddings. Hunter Search should now return results.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
