/**
 * Apex Hunter: Expert Entity Resolution search.
 * pgvector similarity + Unfindable (25% boost for Trail B/C without A) + seniority flag.
 * Server-side pagination (up to 5,000 experts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { generateEmbedding } from '@/lib/openai';
import { parseBody } from '@/lib/api-validate';
import { hunterSearchBodySchema } from '@/lib/schemas/api';
import { logger } from '@/lib/logger';

const UNFINDABLE_BOOST = 1.25;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_TOTAL = 5000;

type Footprint = { trailA?: boolean; trailB?: boolean; trailC?: boolean; trailD?: boolean };

function isUnfindableGem(footprint: Footprint | null): boolean {
  if (!footprint) return false;
  const inBOrC = footprint.trailB === true || footprint.trailC === true;
  const notInA = footprint.trailA !== true;
  return Boolean(inBOrC && notInA);
}

/** Normalize for fuzzy name match: lowercase, collapse spaces, remove accents (simple). */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[àáâãäå]/gi, 'a')
    .replace(/[èéêë]/gi, 'e')
    .replace(/[ìíîï]/gi, 'i')
    .replace(/[òóôõö]/gi, 'o')
    .replace(/[ùúûü]/gi, 'u')
    .slice(0, 200);
}

/** Fuzzy: query name matches expert name (contains or normalized contains). */
function nameMatches(query: string, expertName: string): boolean {
  const q = normalizeName(query);
  const n = normalizeName(expertName);
  if (n.includes(q) || q.includes(n)) return true;
  const qParts = q.split(/\s+/).filter(Boolean);
  const nParts = n.split(/\s+/).filter(Boolean);
  if (qParts.length >= 2 && nParts.length >= 2) {
    const qFirst = qParts[0];
    const qLast = qParts[qParts.length - 1];
    if (qFirst === undefined || qLast === undefined) return false;
    const hasFirst = nParts.some((p) => p.startsWith(qFirst) || qFirst.startsWith(p));
    const hasLast = nParts.some((p) => p.startsWith(qLast) || qLast.startsWith(p));
    if (hasFirst && hasLast) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = parseBody(hunterSearchBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { query, page, pageSize, nameFilter } = parsed.data;

  try {
    const embedding = await generateEmbedding(query.slice(0, 8000));
    const vectorStr = `[${embedding.join(',')}]`;

    const raw = await prisma.$queryRawUnsafe<
      Array<{ expert_id: string; similarity: number }>
    >(
      `SELECT expert_id, 1 - (embedding <=> $1::vector) AS similarity
       FROM expert_vectors
       ORDER BY similarity DESC
       LIMIT $2`,
      vectorStr,
      MAX_TOTAL
    );

    const expertIds = raw.map((r) => r.expert_id);
    const similarityMap = new Map(raw.map((r) => [r.expert_id, r.similarity]));

    if (expertIds.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    const experts = await prisma.expert.findMany({
      where: { id: { in: expertIds } },
      include: {
        engagements: { orderBy: { date: 'desc' }, take: 1, select: { date: true, subjectMatter: true } },
      },
    });

    type Row = {
      expert: (typeof experts)[0];
      similarity: number;
      adjustedScore: number;
      unfindableBoost: boolean;
      lastEngagement: Date | null;
      footprint: Footprint | null;
      seniorityFlag: string | null;
    };

    /** Cross-reference years across sources → DISCREPANCY when values differ (Liar Detector). */
    function computeSeniorityFlag(
      yearsBySource: unknown,
      mainYears: number
    ): 'OK' | 'DISCREPANCY' | null {
      if (!yearsBySource || typeof yearsBySource !== 'object') return null;
      const vals = Object.values(yearsBySource as Record<string, unknown>)
        .filter((v): v is number => typeof v === 'number')
        .concat(mainYears);
      if (vals.length < 2) return null;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return max - min > 2 ? 'DISCREPANCY' : 'OK';
    }

    const rows: Row[] = experts
      .filter((e) => !nameFilter || nameMatches(nameFilter, e.name))
      .map((e) => {
        const similarity = similarityMap.get(e.id) ?? 0;
        const footprint = (e.expertFootprint as Footprint) ?? null;
        const unfindable = isUnfindableGem(footprint);
        const adjustedScore = unfindable ? Math.min(1, similarity * UNFINDABLE_BOOST) : similarity;
        const lastEng = e.engagements?.[0]?.date ?? null;
        const exp = e as { yearsBySource?: unknown; seniorityFlag?: string | null };
        const fromSource = computeSeniorityFlag(exp.yearsBySource, e.yearsExperience);
        const seniorityFlag = exp.seniorityFlag ?? fromSource ?? null;
        return {
          expert: e,
          similarity,
          adjustedScore,
          unfindableBoost: unfindable,
          lastEngagement: lastEng,
          footprint,
          seniorityFlag,
        };
      });

    rows.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const total = rows.length;
    const p = page ?? 1;
    const ps = pageSize ?? 50;
    const totalPages = Math.ceil(total / ps);
    const start = (p - 1) * ps;
    const pageRows = rows.slice(start, start + ps);

    // Persist computed seniority flag when we have yearsBySource and stored value is missing or stale
    const toUpdate = rows.filter((r) => {
      const exp = r.expert as { seniorityFlag?: string | null };
      const computed = r.seniorityFlag;
      return computed && exp.seniorityFlag !== computed;
    });
    if (toUpdate.length > 0) {
      void Promise.all(
        toUpdate.map((r) =>
          prisma.expert.update({
            where: { id: r.expert.id },
            data: { seniorityFlag: r.seniorityFlag },
          })
        )
      ).catch((err) => console.warn('[Hunter] seniorityFlag persist:', err));
    }

    return NextResponse.json({
      results: pageRows.map((r) => ({
        id: r.expert.id,
        name: r.expert.name,
        industry: r.expert.industry,
        subIndustry: r.expert.subIndustry,
        country: r.expert.country,
        seniorityScore: r.expert.seniorityScore,
        yearsExperience: r.expert.yearsExperience,
        predictedRate: r.expert.predictedRate,
        averageActualRate: r.expert.averageActualRate,
        matchScore: Math.round(r.adjustedScore * 100) / 100,
        originalSimilarity: r.similarity,
        unfindableBoost: r.unfindableBoost,
        lastEngagement: r.lastEngagement?.toISOString() ?? null,
        scentTrails: r.footprint ?? { trailA: false, trailB: false, trailC: false, trailD: true },
        seniorityFlag: r.seniorityFlag,
      })),
      total,
      page: p,
      pageSize: ps,
      totalPages,
    });
  } catch (err) {
    logger.error({ err }, 'Hunter search error');
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // Surface common config issues for easier debugging
    const hint =
      msg.includes('API key') || msg.includes('api_key') || msg.includes('Invalid')
        ? 'Check OPENROUTER_API_KEY, OPENAI_API_KEY, or XAI_API_KEY in Vercel env.'
        : msg.includes('expert_vectors') || msg.includes('relation')
          ? 'expert_vectors table may be missing. Run migrations and seed embeddings.'
          : msg.includes('connect') || msg.includes('ECONNREFUSED')
            ? 'Database connection failed. Check DATABASE_URL.'
            : null;
    return NextResponse.json(
      { error: 'Search failed', details: msg, hint },
      { status: 500 }
    );
  }
}
