import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { parseQuery } from '@/lib/api-validate';
import { coordinatorTasksQuerySchema } from '@/lib/schemas/api';

/**
 * GET: List AgentTaskState (Blackboard) rows for a project — for the Team View.
 * Query: projectId (required)
 * Returns tasks with per-agent status and message so the UI can show "The Hunter is searching...", etc.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const queryParsed = parseQuery(coordinatorTasksQuerySchema, Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!queryParsed.success) return queryParsed.response;
  const { projectId } = queryParsed.data;

  const creatorId = await getOrCreateCurrentUser();
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { creatorId: true },
  });
  if (!project || project.creatorId !== creatorId) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
  }

  const tasks = await prisma.agentTaskState.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      candidateLabel: true,
      expertId: true,
      hunterStatus: true,
      hunterMessage: true,
      scholarStatus: true,
      scholarMessage: true,
      valuerStatus: true,
      valuerMessage: true,
      auditorStatus: true,
      auditorMessage: true,
      eliteProfile: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ tasks });
}
