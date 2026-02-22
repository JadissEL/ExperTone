/**
 * Brief ingestion API — treats pasted client brief as structured knowledge event.
 * Creates or updates project, triggers n8n Query Mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { triggerResearchProject } from '@/lib/dispatch';
import { triggerExpertHunt, isN8nLocalhost } from '@/app/lib/n8n-bridge';
import { parseBody } from '@/lib/api-validate';
import { z } from 'zod';

const briefIngestBodySchema = z.object({
  rawBrief: z.string().min(1).max(8000),
  projectId: z.string().cuid().optional(),
});

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

  const parsed = parseBody(briefIngestBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { rawBrief, projectId } = parsed.data;

  if (process.env.VERCEL && isN8nLocalhost) {
    return NextResponse.json(
      {
        error: 'n8n not configured for production',
        hint: 'Set N8N_WEBHOOK_URL in Vercel env.',
      },
      { status: 503 }
    );
  }

  const creatorId = await getOrCreateCurrentUser();
  const title = rawBrief.trim().slice(0, 100);

  if (!projectId) {
    // Create new project and trigger n8n
    const result = await triggerResearchProject({
      title: title || 'Client Brief',
      filterCriteria: {
        brief: rawBrief.trim(),
        query: rawBrief.trim(),
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: 'TRIGGER_FAILED' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      projectId: result.projectId,
      projectTitle: result.projectTitle,
      ingested: true,
      created: true,
    });
  }

  // Update existing project and trigger n8n
  const project = await prisma.researchProject.findFirst({
    where: {
      id: projectId,
      creatorId,
    },
    select: { id: true, filterCriteria: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const existingCriteria = (project.filterCriteria as Record<string, unknown>) ?? {};
  const updatedCriteria = {
    ...existingCriteria,
    brief: rawBrief.trim(),
    query: rawBrief.trim(),
  };

  await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      filterCriteria: updatedCriteria as object,
      status: 'RUNNING',
    },
  });

  const huntResult = await triggerExpertHunt({
    projectId,
    projectTitle: title,
    query: rawBrief.trim(),
    brief: rawBrief.trim(),
    filterCriteria: updatedCriteria,
  });

  if (!huntResult.ok) {
    return NextResponse.json(
      { error: huntResult.error, projectId, ingested: true, n8nFailed: true },
      { status: 200 }
    );
  }

  return NextResponse.json({
    projectId,
    projectTitle: title,
    ingested: true,
    created: false,
  });
}
