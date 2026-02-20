import { requireAdmin } from '@/lib/requireAdmin';
import Link from 'next/link';
import { Shield, Users, Gavel, Activity, Settings, Database, Heart, ShieldCheck, BarChart3 } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  const nav = [
    { href: '/admin', label: 'Overview', icon: Shield },
    { href: '/admin/health', label: 'Platform Health', icon: Heart },
    { href: '/admin/users', label: 'Users & Teams', icon: Users },
    { href: '/admin/ownership', label: 'Ownership Governance', icon: Gavel },
    { href: '/admin/compliance', label: 'Compliance & Trust', icon: ShieldCheck },
    { href: '/admin/decay', label: 'Data Decay Monitor', icon: Activity },
    { href: '/admin/liquidity', label: 'Market Liquidity', icon: BarChart3 },
    { href: '/admin/audit', label: 'Audit Trail', icon: Database },
    { href: '/admin/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-200">
          <h1 className="font-semibold text-slate-900">Governance Suite</h1>
          <p className="text-xs text-slate-500">Admin Panel</p>
        </div>
        <nav className="p-2">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
