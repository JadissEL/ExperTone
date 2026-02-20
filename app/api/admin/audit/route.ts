import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const actorId = searchParams.get('actorId');
  const targetId = searchParams.get('targetId');
  const action = searchParams.get('action');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);

  const where: Record<string, unknown> = {};
  if (actorId) where.actorId = actorId;
  if (targetId) where.targetId = targetId;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const actorIds = Array.from(new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true },
  });
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a.email]));

  const serialized = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    actorEmail: l.actorId ? actorMap[l.actorId] ?? l.actorId : null,
  }));

  return NextResponse.json({ logs: serialized });
}
