/**
 * Remove duplicate experts by name (keep first, delete rest).
 * Run: npx tsx scripts/dedupe-experts.ts
 * Run: npx tsx scripts/dedupe-experts.ts --dry-run   # preview only
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const experts = await prisma.expert.findMany({
    select: { id: true, name: true, industry: true, subIndustry: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const byNormalizedName = new Map<string, typeof experts>();
  for (const e of experts) {
    const key = normalizeName(e.name);
    const list = byNormalizedName.get(key) ?? [];
    list.push(e);
    byNormalizedName.set(key, list);
  }

  const toDelete: (typeof experts)[0][] = [];
  for (const [, list] of byNormalizedName) {
    if (list.length > 1) {
      const [keep, ...dupes] = list;
      toDelete.push(...dupes);
      console.log(`"${keep!.name}" (${list.length} copies): keeping id=${keep!.id}, deleting ${dupes.length}`);
    }
  }

  if (toDelete.length === 0) {
    console.log('No duplicate names found.');
    return;
  }

  console.log(`\n${dryRun ? '[DRY RUN] Would delete' : 'Deleting'} ${toDelete.length} duplicate experts.`);
  if (dryRun) return;

  for (const e of toDelete) {
    await prisma.expert.delete({ where: { id: e.id } });
    console.log('  Deleted:', e.name, `(${e.industry} / ${e.subIndustry})`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
