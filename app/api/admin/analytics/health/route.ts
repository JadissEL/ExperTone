import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { getEmbedding } from '@/lib/ml-client';

/**
 * Platform Health / Elite Analytics: conversion, ROI proxy, search latency.
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    newExpertsCount,
    newExpertsVerifiedCount,
    totalExperts,
    globalPoolCount,
    mlLatencyMs,
    embeddingLatencyMs,
  ] = await Promise.all([
    prisma.expert.count({ where: { createdAt: { gte: since } } }),
    prisma.expert.count({
      where: { createdAt: { gte: since }, visibilityStatus: 'GLOBAL_POOL' },
    }),
    prisma.expert.count(),
    prisma.expert.count({ where: { visibilityStatus: 'GLOBAL_POOL' } }),
    measureMlLatency(),
    measureEmbeddingLatency(),
  ]);

  const conversionRate =
    newExpertsCount > 0
      ? Math.round((newExpertsVerifiedCount / newExpertsCount) * 100)
      : 0;

  const roiSample = await prisma.expert.findMany({
    where: { predictedRate: { gt: 0 } },
    select: { predictedRate: true, predictedRateRange: true },
    take: 100,
  });

  let predictedVsSuggestedAccuracy: number | null = null;
  if (roiSample.length > 0) {
    const withRange = roiSample.filter(
      (e) => e.predictedRateRange && typeof (e.predictedRateRange as { predicted_rate?: number }).predicted_rate === 'number'
    );
    if (withRange.length > 0) {
      const errors = withRange.map((e) => {
        const suggested = (e.predictedRateRange as { predicted_rate: number }).predicted_rate;
        return Math.abs((e.predictedRate - suggested) / (suggested || 1));
      });
      predictedVsSuggestedAccuracy = Math.round((1 - errors.reduce((a, b) => a + b, 0) / errors.length) * 100);
    }
  }

  return NextResponse.json({
    conversion: {
      newExpertsLast30Days: newExpertsCount,
      verifiedByCsaLast30Days: newExpertsVerifiedCount,
      conversionRatePct: conversionRate,
    },
    systemRoi: {
      totalExperts,
      globalPoolCount,
      predictedVsSuggestedAccuracyPct: predictedVsSuggestedAccuracy,
    },
    searchLatency: {
      mlServiceMs: mlLatencyMs,
      grokEmbeddingMs: embeddingLatencyMs,
    },
  });
}

async function measureMlLatency(): Promise<number | null> {
  const base = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const start = performance.now();
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok ? Math.round(performance.now() - start) : null;
  } catch {
    return null;
  }
}

async function measureEmbeddingLatency(): Promise<number | null> {
  const start = performance.now();
  try {
    await getEmbedding('test query for latency check');
    return Math.round(performance.now() - start);
  } catch {
    return null;
  }
}
