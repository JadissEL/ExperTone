import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { AdminUsersClient } from './AdminUsersClient';

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      teamId: true,
      createdAt: true,
      _count: { select: { ownedExperts: true, researchProjects: true } },
    },
    orderBy: { email: 'asc' },
  });

  const usersWithScores = await Promise.all(
    users.map(async (u) => {
      const owned = u._count.ownedExperts;
      const converted = await prisma.expert.count({
        where: { ownerId: u.id, visibilityStatus: 'GLOBAL_POOL' },
      });
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        teamId: u.teamId,
        createdAt: u.createdAt,
        totalOwned: owned,
        convertedToGlobal: converted,
        contributionScore: owned > 0 ? (converted / owned) * 100 : 0,
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">User & Team Taxonomy</h1>
      <p className="mt-1 text-slate-500">
        Permission matrix, incentive analytics, and active sessions
      </p>

      <AdminUsersClient
        users={usersWithScores}
        activeProjects={activeProjects}
      />
    </div>
  );
}
