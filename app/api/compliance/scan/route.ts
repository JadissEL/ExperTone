import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { persistComplianceGuard } from '@/lib/compliance-guard';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { expertId?: string; projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const expertId = body.expertId?.trim();
  const projectId = body.projectId?.trim();
  if (!expertId) {
    return NextResponse.json({ error: 'expertId is required' }, { status: 400 });
  }

  try {
    const result = await persistComplianceGuard(expertId, projectId);
    return NextResponse.json({
      expertId,
      projectId: projectId ?? null,
      complianceScore: result.score,
      mnpiRiskLevel: result.mnpiRiskLevel,
      requiresManualScreening: result.requiresManualScreening,
      flags: result.flags,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Compliance scan failed' },
      { status: 400 }
    );
  }
}
