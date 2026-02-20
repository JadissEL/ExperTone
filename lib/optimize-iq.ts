/**
 * Recursive Learning Module (Holistic Intelligence Nexus).
 * - ML Retraining: compare predicted_rate vs actual_cost; if MAE > 15%, trigger FastAPI retrain.
 * - Tag Evolution: subject_matter from engagements with count >= 10 → High-Value Sub-industry taxonomy.
 */

import { prisma } from '@/lib/prisma';

const MAE_THRESHOLD_PCT = 0.15;
const MIN_ENGAGEMENTS_FOR_MAE = 5;
const TAG_EVOLUTION_MIN_COUNT = 10;

export interface OptimizeIqResult {
  mae: number | null;
  maePct: number | null;
  sampleSize: number;
  retrainTriggered: boolean;
  retrainError?: string;
  tagsAdded: string[];
  highValueSubIndustries: string[];
}

export async function runOptimizeIq(): Promise<OptimizeIqResult> {
  const result: OptimizeIqResult = {
    mae: null,
    maePct: null,
    sampleSize: 0,
    retrainTriggered: false,
    tagsAdded: [],
    highValueSubIndustries: [],
  };

  // 1) MAE: engagements with expert predicted_rate vs actual_cost
  const engagementsWithExpert = await prisma.engagement.findMany({
    where: { expert: { predictedRate: { gt: 0 } } },
    select: {
      actualCost: true,
      expertId: true,
      expert: { select: { predictedRate: true } },
    },
  });

  if (engagementsWithExpert.length >= MIN_ENGAGEMENTS_FOR_MAE) {
    const errors = engagementsWithExpert.map(
      (e) => Math.abs((e.expert.predictedRate ?? 0) - e.actualCost)
    );
    const actuals = engagementsWithExpert.map((e) => e.actualCost);
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
    const meanActual =
      actuals.reduce((a, b) => a + b, 0) / actuals.length || 1;
    const maePct = meanActual > 0 ? mae / meanActual : 0;

    result.mae = Math.round(mae * 100) / 100;
    result.maePct = maePct;
    result.sampleSize = engagementsWithExpert.length;

    if (maePct > MAE_THRESHOLD_PCT) {
      const base = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      try {
        const res = await fetch(`${base}/insights/train-rate-model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger: 'mae_above_15',
            mae: result.mae,
            mae_pct: maePct,
            use_engagements: true,
          }),
          signal: AbortSignal.timeout(60000),
        });
        result.retrainTriggered = res.ok;
        if (!res.ok) {
          result.retrainError = await res.text();
        }
      } catch (err) {
        result.retrainError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  // 2) Tag evolution: subject_matter counts from engagements
  const subjectCounts = await prisma.engagement.groupBy({
    by: ['subjectMatter'],
    _count: { id: true },
    where: { subjectMatter: { not: '' } },
  });

  const normalizedCounts = new Map<string, number>();
  for (const row of subjectCounts) {
    const normalized = (row.subjectMatter || '').trim();
    if (normalized.length < 2) continue;
    const key =
      normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    normalizedCounts.set(key, (normalizedCounts.get(key) ?? 0) + row._count.id);
  }

  let highValue: string[] = [];
  const existing = await prisma.systemConfig.findUnique({
    where: { key: 'high_value_sub_industries' },
  });
  if (existing?.value && Array.isArray(existing.value)) {
    highValue = (existing.value as string[]).slice();
  }

  for (const [tag, count] of normalizedCounts) {
    if (count >= TAG_EVOLUTION_MIN_COUNT && !highValue.includes(tag)) {
      highValue.push(tag);
      result.tagsAdded.push(tag);
    }
  }

  if (result.tagsAdded.length > 0) {
    await prisma.systemConfig.upsert({
      where: { key: 'high_value_sub_industries' },
      create: { key: 'high_value_sub_industries', value: highValue },
      update: { value: highValue },
    });
  }
  result.highValueSubIndustries = highValue;

  return result;
}
