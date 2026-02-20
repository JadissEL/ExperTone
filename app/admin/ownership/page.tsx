import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { OwnershipGovernanceClient } from './OwnershipGovernanceClient';

export default async function AdminOwnershipPage() {
  await requireAdmin();

  const [tickets, users, verifiedExperts] = await Promise.all([
    prisma.ticket.findMany({
      where: { status: 'OPEN' },
      include: {
        expert: {
          select: { id: true, name: true, industry: true, ownerId: true },
          include: { owner: { select: { id: true, email: true } } },
        },
        requester: { select: { id: true, email: true } },
        owner: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: { in: ['CSA', 'TEAM_LEAD'] } },
      select: { id: true, email: true },
    }),
    prisma.expert.findMany({
      where: {
        contacts: {
          some: {
            isVerified: true,
            verifiedAt: { not: null },
          },
        },
      },
      include: {
        owner: { select: { id: true, email: true } },
        contacts: {
          where: { isVerified: true },
          select: { id: true, type: true, value: true, verifiedAt: true, verifiedBy: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
  ]);

  const serialized = {
    tickets: tickets.map((t) => ({
      ...t,
      expert: {
        ...t.expert,
        owner: t.expert.owner,
      },
    })),
    users,
    verifiedExperts: verifiedExperts.map((e) => ({
      ...e,
      contacts: e.contacts.map((c) => ({
        ...c,
        verifiedAt: c.verifiedAt?.toISOString() ?? null,
      })),
    })),
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Ownership Governance</h1>
      <p className="mt-1 text-slate-500">
        Dispute resolver, force-expire, and verification audit
      </p>
      <OwnershipGovernanceClient
        tickets={serialized.tickets}
        users={serialized.users}
        verifiedExperts={serialized.verifiedExperts}
      />
    </div>
  );
}
