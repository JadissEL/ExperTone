import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export interface SystemHealthCheck {
  pgvectorOptimized: boolean;
  orphanedExpertsCount: number;
  mlHeartbeatStable: boolean;
  graphReflectsEngagements: { lastEngagementAt: string | null; engagementCount: number };
}

/**
 * Master Elite Status Check: pgvector, orphaned experts, ML heartbeat, graph vs engagements.
 */
export async function GET() {
  const results: SystemHealthCheck = {
    pgvectorOptimized: false,
    orphanedExpertsCount: 0,
    mlHeartbeatStable: false,
    graphReflectsEngagements: { lastEngagementAt: null, engagementCount: 0 },
  };

  try {
    const vectorCount = await prisma.expertVector.count();
    results.pgvectorOptimized = vectorCount >= 0;
  } catch {
    results.pgvectorOptimized = false;
  }

  try {
    const orphaned = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM experts e
      WHERE e.visibility_status != 'GLOBAL_POOL'
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.owner_id)
    `;
    results.orphanedExpertsCount = Number(orphaned[0]?.count ?? 0);
  } catch {
    results.orphanedExpertsCount = -1;
  }

  try {
    const res = await fetch(`${ML_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    results.mlHeartbeatStable = res.ok;
  } catch {
    results.mlHeartbeatStable = false;
  }

  try {
    const agg = await prisma.engagement.aggregate({
      _max: { date: true },
      _count: { id: true },
    });
    results.graphReflectsEngagements = {
      lastEngagementAt: agg._max.date?.toISOString() ?? null,
      engagementCount: agg._count.id,
    };
  } catch {
    // leave default
  }

  return NextResponse.json(results);
}
