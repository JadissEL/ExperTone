import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature, getSignatureFromRequest } from '@/lib/webhook-verify';
import { generateEmbedding } from '@/lib/openai';
import { computeReputationScore } from '@/lib/reputation';
import { encryptContactValue } from '@/lib/pii';
import { parseBody } from '@/lib/api-validate';
import { n8nCallbackBodySchema } from '@/lib/schemas/api';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { logger } from '@/lib/logger';
import { startRequestTimer } from '@/lib/api-instrument';

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

async function findExistingExpert(
  name: string,
  contacts?: Array<{ type: string; value: string }>
): Promise<{ id: string } | null> {
  const norm = normalizeName(name);

  const byName = await prisma.expert.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (byName) return byName;

  if (contacts?.length) {
    for (const c of contacts) {
      const val = typeof c?.value === 'string' ? c.value.trim() : '';
      if (!val) continue;
      const byContact = await prisma.expert.findFirst({
        where: {
          contacts: {
            some: { value: val },
          },
        },
        select: { id: true },
      });
      if (byContact) return byContact;
    }
  }

  const bySimilarName = await prisma.expert.findFirst({
    where: {
      name: { contains: norm.slice(0, 30), mode: 'insensitive' },
    },
    select: { id: true },
  });
  return bySimilarName;
}

export async function POST(req: NextRequest) {
  const timer = startRequestTimer('/api/webhooks/n8n-callback', 'POST');
  const rawBody = await req.text();
  const signature = getSignatureFromRequest(req.headers);

  const webhookSecret = process.env.SHARED_SECRET || process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) {
    timer.done(401);
    return NextResponse.json(
      { error: 'Webhook secret not configured', code: 'CONFIG_ERROR' },
      { status: 503 }
    );
  }
  if (!verifyWebhookSignature(rawBody, signature)) {
    timer.done(401);
    return NextResponse.json({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' }, { status: 401 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    timer.done(400);
    return NextResponse.json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = parseBody(n8nCallbackBodySchema, rawPayload);
  if (!parsed.success) {
    timer.done(400);
    return parsed.response;
  }
  const payload = parsed.data;

  const projectId = payload.projectId ?? payload.project_id;
  if (!projectId || projectId.trim() === '') {
    return NextResponse.json({ error: 'Missing projectId', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { id: true, creatorId: true },
  });

  if (!project) {
    timer.done(404);
    return NextResponse.json({ error: 'Project not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const experts = payload.experts ?? [];
  const results: Array<{ expertId: string; alreadyExisting: boolean }> = [];

  for (const e of experts) {
    if (!e.name?.trim()) continue;

    const existing = await findExistingExpert(e.name, e.contacts);

    if (existing) {
      try {
        await prisma.researchResult.upsert({
          where: {
            projectId_expertId: { projectId, expertId: existing.id },
          },
          create: {
            projectId,
            expertId: existing.id,
            matchScore: 0.7,
            classificationTier: 'B',
          },
          update: {},
        });
        results.push({ expertId: existing.id, alreadyExisting: true });

        // Enrichment: persist source provenance and update expert when n8n sends new data
        const linkedinUrl = typeof e.linkedin_url === 'string' && e.linkedin_url.trim() ? e.linkedin_url.trim() : null;
        if (linkedinUrl) {
          const existingSource = await prisma.expertSource.findFirst({
            where: { expertId: existing.id, sourceType: 'linkedin' },
          });
          if (!existingSource) {
            await prisma.expertSource.create({
              data: { expertId: existing.id, sourceType: 'linkedin', sourceUrl: linkedinUrl },
            });
          }
        }
        const pastEmployers = Array.isArray(e.career_history) && e.career_history.length > 0
          ? (e.career_history as string[]).slice(0, 20)
          : undefined;
        const skills = Array.isArray(e.skills) && e.skills.length > 0
          ? (e.skills as string[]).slice(0, 30)
          : undefined;
        const current = await prisma.expert.findUnique({
          where: { id: existing.id },
          select: { pastEmployers: true, linkedinUrl: true, skills: true },
        });
        const hasHistory = Array.isArray(current?.pastEmployers) && (current.pastEmployers as unknown[]).length > 0;
        const hasSkills = Array.isArray(current?.skills) && (current.skills as unknown[]).length > 0;
        const needsUpdate =
          (pastEmployers && !hasHistory) ||
          (skills && !hasSkills) ||
          (linkedinUrl && !current?.linkedinUrl) ||
          (e.source_verified != null);
        if (needsUpdate) {
          const updateData: { pastEmployers?: string[]; skills?: string[]; sourceVerified?: boolean; linkedinUrl?: string } = {};
          if (pastEmployers && !hasHistory) updateData.pastEmployers = pastEmployers;
          if (skills && !hasSkills) updateData.skills = skills;
          if (e.source_verified != null) updateData.sourceVerified = e.source_verified;
          if (linkedinUrl && !current?.linkedinUrl) updateData.linkedinUrl = linkedinUrl;
          if (Object.keys(updateData).length > 0) {
            await prisma.expert.update({
              where: { id: existing.id },
              data: updateData,
            });
          }
        }
      } catch (err) {
        logger.warn({ err, projectId, expertId: existing.id }, '[n8n-callback] ResearchResult upsert failed');
      }
      continue;
    }

    const sourceVerified = e.source_verified ?? (e.contacts?.length ? true : null);
    const linkedinUrl = typeof e.linkedin_url === 'string' && e.linkedin_url.trim() ? e.linkedin_url.trim() : null;
    const pastEmployers = Array.isArray(e.career_history) && e.career_history.length > 0
      ? (e.career_history as string[]).slice(0, 20)
      : undefined;
    const skills = Array.isArray(e.skills) && e.skills.length > 0
      ? (e.skills as string[]).slice(0, 30)
      : undefined;
    const newExpert = await prisma.expert.create({
      data: {
        name: e.name.trim(),
        industry: (e.industry as string) || 'Other',
        subIndustry: (e.sub_industry as string) || 'General',
        country: (e.country as string) || 'Unknown',
        region: (e.region as string) || 'Unknown',
        seniorityScore: Math.min(100, Math.max(0, (e.seniority_score as number) ?? 50)),
        yearsExperience: Math.min(50, Math.max(0, (e.years_experience as number) ?? 5)),
        predictedRate: (e.predicted_rate as number) ?? 150,
        ownerId: project.creatorId,
        visibilityStatus: 'PRIVATE',
        sourceVerified: sourceVerified ?? undefined,
        linkedinUrl: linkedinUrl ?? undefined,
        pastEmployers: pastEmployers ?? undefined,
        skills: skills ?? undefined,
      },
    });

    if (e.contacts?.length) {
      const contactData = e.contacts
        .filter((c) => typeof c?.value === 'string' && c.value.trim())
        .map((c) => ({
          expertId: newExpert.id,
          type: (c.type?.toUpperCase() === 'PHONE' ? 'PHONE' : 'EMAIL') as 'PHONE' | 'EMAIL',
          value: encryptContactValue(String(c.value).trim()),
          source: 'n8n_scrape',
        }));
      if (contactData.length > 0) {
        await prisma.expertContact.createMany({ data: contactData });
      }
    }

    if (linkedinUrl) {
      await prisma.expertSource.create({
        data: { expertId: newExpert.id, sourceType: 'linkedin', sourceUrl: linkedinUrl },
      });
    }

    await prisma.researchResult.create({
      data: {
        projectId,
        expertId: newExpert.id,
        matchScore: 0.8,
        classificationTier: 'A',
      },
    });

    // Embedding for Hunter Search / semantic search (expert_vectors)
    const embeddingText = `${newExpert.industry} ${newExpert.subIndustry}`.trim();
    if (embeddingText.length > 0) {
      try {
        const embedding = await generateEmbedding(embeddingText);
        const vectorStr = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO expert_vectors (id, expert_id, embedding) VALUES ($1, $2, $3::vector)`,
          randomUUID(),
          newExpert.id,
          vectorStr
        );
      } catch (err) {
        logger.warn({ err, expertId: newExpert.id }, '[n8n-callback] Embedding failed, expert created without vector');
      }
    }

    // Intelligence Layer: suggested rate + reputation (non-blocking best-effort)
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    fetchWithTimeout(
      `${mlUrl}/insights/suggested-rate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniority_score: newExpert.seniorityScore,
          years_experience: newExpert.yearsExperience,
          country: newExpert.country ?? '',
          region: newExpert.region ?? '',
          industry: newExpert.industry ?? 'Other',
        }),
      },
      8000
    )
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.suggested_rate_min === 'number' && typeof data.suggested_rate_max === 'number') {
          return prisma.expert.update({
            where: { id: newExpert.id },
            data: { predictedRateRange: { min: data.suggested_rate_min, max: data.suggested_rate_max, predicted_rate: data.predicted_rate } },
          });
        }
      })
      .catch((err) => logger.warn({ err, expertId: newExpert.id }, '[n8n-callback] ML suggested-rate failed'));
    computeReputationScore(newExpert.id, { persist: true }).catch((err) =>
      logger.warn({ err, expertId: newExpert.id }, '[n8n-callback] Reputation score failed')
    );

    results.push({ expertId: newExpert.id, alreadyExisting: false });
  }

  if (payload.complete || payload.status === 'complete') {
    await prisma.researchProject.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' },
    });
  }

  timer.done(200);
  return NextResponse.json({
    ok: true,
    projectId,
    processed: results.length,
    complete: payload.complete ?? payload.status === 'complete',
  });
}
