import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { runCoordinatorPipeline } from '@/lib/coordinator';
import { parseBody } from '@/lib/api-validate';
import { coordinatorRunBodySchema } from '@/lib/schemas/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST: Start the Coordinator pipeline for a project.
 * Body: { projectId: string, brief: string }
 * Decomposes brief, dispatches Hunter + Scholar (+ Valuer + Auditor), writes to Blackboard.
 */
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

  const parsed = parseBody(coordinatorRunBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { projectId, brief } = parsed.data;

  const creatorId = await getOrCreateCurrentUser();
  const result = await runCoordinatorPipeline({ projectId, brief, creatorId });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    taskId: result.taskId,
    projectId: result.projectId,
    message: 'Pipeline started; check Agent Squad for status.',
  });
}
