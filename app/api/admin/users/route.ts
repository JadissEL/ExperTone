import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { logger } from '@/lib/logger';

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
  const [users, globalPoolCount, totalExperts, convertedByOwner] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        teamId: true,
        createdAt: true,
        _count: {
          select: {
            ownedExperts: true,
            researchProjects: true,
          },
        },
      },
      orderBy: { email: 'asc' },
    }),
    prisma.expert.count({ where: { visibilityStatus: 'GLOBAL_POOL' } }),
    prisma.expert.count(),
    prisma.expert.groupBy({
      by: ['ownerId'],
      where: { visibilityStatus: 'GLOBAL_POOL' },
      _count: { id: true },
    }),
  ]);

  const convertedMap = new Map(convertedByOwner.map((g) => [g.ownerId, g._count.id]));
  const usersWithScores = users.map((u) => {
    const owned = u._count.ownedExperts;
    const converted = convertedMap.get(u.id) ?? 0;
    const contributionPct = owned > 0 ? (converted / owned) * 100 : 0;
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      teamId: u.teamId,
      createdAt: u.createdAt,
      totalOwned: owned,
      convertedToGlobal: converted,
      contributionScore: contributionPct,
      projectCount: u._count.researchProjects,
    };
  });

  const activeProjects = await prisma.researchProject.findMany({
    where: { status: 'RUNNING' },
    select: {
      id: true,
      title: true,
      status: true,
      creator: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json({
    users: usersWithScores,
    activeProjects,
    stats: { totalExperts, globalPoolCount },
  });
  } catch (err) {
    logger.error({ err }, '[admin/users] Failed');
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
