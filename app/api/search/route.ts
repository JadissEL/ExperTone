import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { generateEmbedding } from '@/lib/openai';
import { rateLimitSearch } from '@/lib/rate-limit';
import { decryptContacts } from '@/lib/pii';
import { canRevealCloakedContacts, getCurrentDbUser, maskContactValue } from '@/lib/expert-access';
import { parseBody } from '@/lib/api-validate';
import { searchBodySchema } from '@/lib/schemas/api';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limiter = rateLimitSearch(userId);
  if (!limiter.allowed) {
    return NextResponse.json(
      {
        error: 'Too many search requests. Please try again later.',
        retryAfter: Math.ceil((limiter.resetAt - Date.now()) / 1000),
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limiter.resetAt - Date.now()) / 1000)) } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = parseBody(searchBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { query, limit } = parsed.data;
  const currentUser = await getCurrentDbUser();

  try {
    const embedding = await generateEmbedding(query);
    const vectorStr = `[${embedding.join(',')}]`;

    const results = await prisma.$queryRawUnsafe<
      Array<{ expert_id: string; similarity: number }>
    >(
      `SELECT expert_id, 1 - (embedding <=> $1::vector) AS similarity 
       FROM expert_vectors 
       ORDER BY similarity DESC 
       LIMIT $2`,
      vectorStr,
      limit
    );

    const expertIds = results.map((r) => r.expert_id);
    const similarityMap = new Map(results.map((r) => [r.expert_id, r.similarity]));

    const experts = await prisma.expert.findMany({
      where: { id: { in: expertIds } },
      include: {
        contacts: true,
        engagements: { where: { clientFeedbackScore: { lt: 3 } }, select: { subjectMatter: true } },
      },
    });

    const queryNorm = query.toLowerCase().trim();

    const subjectMatchesSearch = (subject: string): boolean => {
      const s = subject.toLowerCase().trim();
      return s === queryNorm || queryNorm.includes(s) || s.includes(queryNorm);
    };

    const rankedCandidates = await Promise.all(expertIds.map(async (id) => {
        const expert = experts.find((e) => e.id === id);
        const similarity = similarityMap.get(id) ?? 0;
        if (!expert) return null;
        const expertData = expert as typeof expert & { contactCloaked?: boolean };
        const contacts = decryptContacts(expert.contacts);
        const canReveal = !expertData.contactCloaked
          ? true
          : currentUser
            ? await canRevealCloakedContacts({ userId: currentUser.id, expertId: expertData.id })
            : false;
        const safeContacts = canReveal
          ? contacts
          : contacts.map((c) => ({ ...c, value: maskContactValue(c.value), isVerified: false }));
        if (canReveal && safeContacts.length > 0) {
          void prisma.$executeRawUnsafe(
            `INSERT INTO "contact_attempts" ("id", "expert_id", "created_at") VALUES ($1, $2, NOW())`,
            randomUUID(),
            expertData.id
          ).catch(() => undefined);
        }
        const subjectMap = (expert.subjectFrequencyMap as Record<string, number>) || {};
        const hasProvenExperience = Object.keys(subjectMap).some((k) => subjectMatchesSearch(k));
        const adjustedSimilarity = hasProvenExperience ? Math.min(1, similarity * 1.2) : similarity;
        const lowFeedbackSubjects = (expert.engagements || []).map((e) => e.subjectMatter);
        const qualityWarning = lowFeedbackSubjects.some((sub) => subjectMatchesSearch(sub));
        return {
          expert: { ...expert, contacts: safeContacts },
          similarity: adjustedSimilarity,
          originalSimilarity: similarity,
          qualityWarning,
          provenExperience: hasProvenExperience,
        };
      }));
    const ranked = rankedCandidates.filter(Boolean) as Array<{
        expert: (typeof experts)[0] & { contacts: ReturnType<typeof decryptContacts> };
        similarity: number;
        originalSimilarity: number;
        qualityWarning: boolean;
        provenExperience: boolean;
      }>;

    ranked.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({
      results: ranked.map((r) => ({
        expert: r.expert,
        similarity: r.similarity,
        originalSimilarity: r.originalSimilarity,
        qualityWarning: r.qualityWarning,
        provenExperience: r.provenExperience,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Semantic search error');
    return NextResponse.json(
      { error: 'Search failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
