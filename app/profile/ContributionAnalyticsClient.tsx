'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Shield } from 'lucide-react';

interface ContributionData {
  databaseROI: number;
  totalOwned: number;
  privateCount: number;
  globalPoolCount: number;
  ownershipHealthPct: number;
}

export function ContributionAnalyticsClient() {
  const [data, setData] = useState<ContributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me/contribution', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        Loading contribution analytics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error || 'No data'}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Database ROI
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Revenue from expert profiles you found and own: engagement actual costs attributed to your experts.
        </p>
        <p className="mt-3 text-3xl font-semibold text-slate-900">
          ${typeof data.databaseROI === 'number' ? data.databaseROI.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Shield className="h-5 w-5 text-blue-500" />
          Ownership Health
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Percentage of your experts that stay Private vs. lost to the Global Pool. Data hygiene as a competitive KPI.
        </p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-slate-900">{data.ownershipHealthPct}%</span>
          <span className="text-sm text-slate-500">Private</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {data.privateCount} of {data.totalOwned} experts remain Private · {data.globalPoolCount} in Global Pool
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${data.ownershipHealthPct}%` }}
          />
        </div>
      </section>
    </div>
  );
}
