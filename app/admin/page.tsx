import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Users, Database, Ticket, FolderKanban } from 'lucide-react';

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [expertCount, privateCount, globalCount, userCount, ticketCount, projectCount] =
    await Promise.all([
      prisma.expert.count(),
      prisma.expert.count({ where: { visibilityStatus: 'PRIVATE' } }),
      prisma.expert.count({ where: { visibilityStatus: 'GLOBAL_POOL' } }),
      prisma.user.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.researchProject.count({ where: { status: 'RUNNING' } }),
    ]);

  const cards = [
    {
      title: 'Total Experts',
      value: expertCount,
      icon: Database,
      href: '/admin/ownership',
    },
    {
      title: 'Private',
      value: privateCount,
      sub: `${((privateCount / expertCount) * 100 || 0).toFixed(0)}%`,
      icon: Database,
    },
    {
      title: 'Global Pool',
      value: globalCount,
      sub: `${((globalCount / expertCount) * 100 || 0).toFixed(0)}%`,
      icon: Database,
    },
    {
      title: 'Users',
      value: userCount,
      icon: Users,
      href: '/admin/users',
    },
    {
      title: 'Open Tickets',
      value: ticketCount,
      icon: Ticket,
      href: '/admin/ownership',
    },
    {
      title: 'Active Projects',
      value: projectCount,
      icon: FolderKanban,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Governance Overview</h1>
      <p className="mt-1 text-slate-500">
        High-privilege control layer for platform equilibrium
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, value, sub, icon: Icon, href }) => (
          <div
            key={title}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{title}</span>
              <Icon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">{value}</span>
              {sub && <span className="text-sm text-slate-500">{sub}</span>}
            </div>
            {href && (
              <Link
                href={href}
                className="mt-2 block text-sm text-blue-600 hover:underline"
              >
                View →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
