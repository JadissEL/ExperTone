/**
 * Backfill embeddings for experts that have no ExpertVector (e.g. created via n8n before fix).
 * Run: npx tsx scripts/backfill-experts-without-embeddings.ts
 * Run: npx tsx scripts/backfill-experts-without-embeddings.ts --limit 50   # process max 50
 * Requires: OPENROUTER_API_KEY (or OPENAI/XAI), DATABASE_URL
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { generateEmbedding } from '../lib/openai';

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '0', 10) : 0;

  const expertsWithoutVectors = await prisma.expert.findMany({
    where: { vector: null },
    select: { id: true, name: true, industry: true, subIndustry: true },
    take: limit > 0 ? limit : undefined,
  });

  if (expertsWithoutVectors.length === 0) {
    console.log('No experts without embeddings. All set.');
    return;
  }

  console.log(`Found ${expertsWithoutVectors.length} experts without embeddings. Backfilling...`);

  let ok = 0;
  let failed = 0;

  for (const e of expertsWithoutVectors) {
    const text = `${e.industry} ${e.subIndustry}`.trim() || e.name;
    try {
      const embedding = await generateEmbedding(text.slice(0, 8000));
      const vectorStr = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO expert_vectors (id, expert_id, embedding) VALUES ($1, $2, $3::vector)`,
        randomUUID(),
        e.id,
        vectorStr
      );
      console.log('  ✓', e.name);
      ok++;
    } catch (err) {
      console.error('  ✗', e.name, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone. Backfilled ${ok}, failed ${failed}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
