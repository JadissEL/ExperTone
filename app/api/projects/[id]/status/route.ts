import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * Lightweight project status for polling / State Sync.
 * Use with SWR refreshInterval for near real-time updates.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.researchProject.findUnique({
    where: { id },
    select: { id: true, status: true, title: true, _count: { select: { results: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({
    projectId: project.id,
    status: project.status,
    title: project.title,
    resultCount: project._count.results,
  });
}
