import { Suspense } from 'react';
import { DashboardClient } from './DashboardClient';
import { GraphErrorBoundary } from '@/components/dashboard/GraphErrorBoundary';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-200">
            Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Expert Intelligence Platform · Single Source of Truth
          </p>
        </div>
        <a
          href="/hunt"
          className="text-sm font-medium text-amber-400 hover:text-amber-300 border border-amber-500/50 hover:border-amber-500 px-3 py-1.5 rounded"
        >
          Apex Hunter · War Room
        </a>
      </div>

      <DashboardClient />
    </main>
  );
}
