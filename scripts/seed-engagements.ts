/**
 * Optional: Populate initial Engagement data from a JSON file.
 * Usage: npx tsx scripts/seed-engagements.ts [path/to/engagements.json]
 *
 * JSON format (array):
 * [
 *   { "expertId": "cuid", "projectId": "cuid", "subjectMatter": "Semiconductors", "actualCost": 250, "clientFeedbackScore": 4, "date": "2024-01-15T10:00:00Z", "durationMinutes": 60 },
 *   ...
 * ]
 */

import { prisma } from '../lib/prisma';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const path = process.argv[2] || resolve(process.cwd(), 'data', 'engagements.json');
  let data: Array<{
    expertId: string;
    projectId: string;
    subjectMatter: string;
    actualCost: number;
    clientFeedbackScore: number;
    date: string;
    durationMinutes: number;
  }>;

  try {
    const raw = readFileSync(path, 'utf-8');
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read or parse file:', path, e);
    console.log('Usage: npx tsx scripts/seed-engagements.ts [path/to/engagements.json]');
    process.exit(1);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.log('No engagements to seed.');
    process.exit(0);
  }

  let created = 0;
  for (const row of data) {
    if (!row.expertId || !row.projectId || !row.subjectMatter || row.clientFeedbackScore < 1 || row.clientFeedbackScore > 5) {
      console.warn('Skipping invalid row:', row);
      continue;
    }
    try {
      await prisma.engagement.create({
        data: {
          expertId: row.expertId,
          projectId: row.projectId,
          subjectMatter: row.subjectMatter.trim(),
          actualCost: Number(row.actualCost),
          clientFeedbackScore: Number(row.clientFeedbackScore),
          date: new Date(row.date),
          durationMinutes: Number(row.durationMinutes) || 60,
        },
      });
      created++;
    } catch (e) {
      console.warn('Failed to create engagement:', row, e);
    }
  }

  console.log(`Created ${created} engagement(s). Updating expert aggregates...`);

  const expertIds = [...new Set(data.map((r) => r.expertId))];
  for (const expertId of expertIds) {
    const engagements = await prisma.engagement.findMany({ where: { expertId } });
    const total = engagements.length;
    const avgRate = total > 0 ? engagements.reduce((s, e) => s + e.actualCost, 0) / total : null;
    const subjectMap: Record<string, number> = {};
    for (const e of engagements) {
      subjectMap[e.subjectMatter] = (subjectMap[e.subjectMatter] || 0) + 1;
    }
    await prisma.expert.update({
      where: { id: expertId },
      data: {
        totalEngagements: total,
        averageActualRate: avgRate,
        subjectFrequencyMap: subjectMap,
        reliabilityIndex: 1.0,
      },
    });
  }

  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
