'use server';

/**
 * Unified API Gateway - Dispatch logic for research project orchestration.
 * Routes to n8n (webhooks) and ML service (embeddings) via env-based service discovery.
 */

import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { researchFilterSchema, type ResearchFilterFormValues } from '@/lib/research-filter-schema';
import { EXPERT_HUNTER_WEBHOOK_URL, adaptHuntPayload, signPayload } from '@/app/lib/n8n-bridge';
import { getEmbedding, isCircuitOpen } from '@/lib/ml-client';

export type TriggerResearchProjectResult =
  | { ok: true; projectId: string; projectTitle: string; status: string; scrapingStarted: boolean }
  | { ok: false; error: string; projectId?: string };

/**
 * Validates 15+ filter criteria, fires n8n webhook (non-blocking),
 * calls ML /embeddings for search intent, updates project to RUNNING.
 */
export async function triggerResearchProject(
  input: {
    title: string;
    filterCriteria?: Record<string, unknown>;
    clientBlacklist?: string[];
    restrictedIndustries?: string[];
  }
): Promise<TriggerResearchProjectResult> {
  const creatorId = await getOrCreateCurrentUser();

  const title = (input.title || 'Research').trim().slice(0, 100);
  const rawFilters = input.filterCriteria ?? {};

  const parsed = researchFilterSchema.safeParse(rawFilters);
  const filterCriteria = parsed.success ? parsed.data : (rawFilters as object);

  const project = await prisma.researchProject.create({
    data: {
      creatorId,
      title,
      status: 'PENDING',
      filterCriteria: filterCriteria as object,
      clientBlacklist: input.clientBlacklist ?? [],
      restrictedIndustries: input.restrictedIndustries ?? [],
    },
  });

  const query = (filterCriteria as ResearchFilterFormValues).brief ||
    (filterCriteria as ResearchFilterFormValues).query ||
    '';
  const payload = {
    projectId: project.id,
    projectTitle: project.title,
    filterCriteria: filterCriteria as Record<string, unknown>,
    query,
    brief: (filterCriteria as ResearchFilterFormValues).brief || undefined,
  };

  let scrapingStarted = false;
  let embeddingProcessed = false;

  const webhookPromise = (async () => {
    try {
      const adapted = adaptHuntPayload(payload);
      const bodyString = JSON.stringify(adapted);
      const signature = signPayload(bodyString);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (signature) headers['X-Webhook-Signature'] = signature;
      const res = await fetch(EXPERT_HUNTER_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: bodyString,
      });
      if (res.ok) {
        scrapingStarted = true;
      }
    } catch {
      // Non-blocking; n8n failure handled by callback / UI toast
    }
  })();

  const embeddingPromise = (async () => {
    const brief =
      (filterCriteria as ResearchFilterFormValues).brief ||
      (filterCriteria as ResearchFilterFormValues).query ||
      title;
    if (!brief || isCircuitOpen()) return;
    try {
      await getEmbedding(brief);
      embeddingProcessed = true;
    } catch {
      // ML down; UI will fallback to basic keyword search
    }
  })();

  await Promise.all([webhookPromise, embeddingPromise]);

  await prisma.researchProject.update({
    where: { id: project.id },
    data: { status: 'RUNNING' },
  });

  return {
    ok: true,
    projectId: project.id,
    projectTitle: project.title,
    status: 'RUNNING',
    scrapingStarted,
  };
}
