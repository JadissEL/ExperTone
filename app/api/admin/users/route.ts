import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const users = await prisma.user.findMany({
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
  });

  const globalPoolCount = await prisma.expert.count({
    where: { visibilityStatus: 'GLOBAL_POOL' },
  });
  const totalExperts = await prisma.expert.count();

  const usersWithScores = await Promise.all(
    users.map(async (u) => {
      const owned = u._count.ownedExperts;
      const converted = await prisma.expert.count({
        where: {
          ownerId: u.id,
          visibilityStatus: 'GLOBAL_POOL',
        },
      });
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
    })
  );

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
}
