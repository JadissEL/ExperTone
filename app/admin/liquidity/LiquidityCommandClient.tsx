'use client';

import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle, RefreshCw, Play } from 'lucide-react';

interface Segment {
  industry: string;
  subIndustry: string;
  region: string;
  label: string;
  demandCount: number;
  supplyCount: number;
  gap: boolean;
}

interface LiquidityData {
  segments: Segment[];
  gaps: Segment[];
  gapThreshold: number;
}

export function LiquidityCommandClient() {
  const [data, setData] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchLiquidity = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/liquidity', { credentials: 'include' });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const triggerScrape = async (seg: Segment) => {
    setTriggering(seg.label);
    try {
      const res = await fetch('/api/admin/liquidity/trigger-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          industry: seg.industry || undefined,
          subIndustry: seg.subIndustry || undefined,
          region: seg.region || undefined,
          title: `Deep Scrape: ${seg.label}`,
        }),
      });
      const json = await res.json();
      if (res.ok && json.projectId) {
        await fetchLiquidity();
      }
    } finally {
      setTriggering(null);
    }
  };

  useEffect(() => {
    fetchLiquidity();
  }, []);

  if (loading && !data) {
    return (
      <div className="mt-6 flex items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-slate-500">
        Loading market liquidity...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
        <button type="button" onClick={fetchLiquidity} className="ml-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fetchLiquidity}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Supply vs. Demand
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Active research projects (demand) matched to available experts in Global Pool (supply). Gap = supply &lt; {d.gapThreshold}.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="pb-2 pr-4">Segment</th>
                <th className="pb-2 pr-4">Demand</th>
                <th className="pb-2 pr-4">Supply</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {d.segments.map((seg) => (
                <tr key={seg.label || seg.industry + seg.subIndustry + seg.region} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{seg.label || 'Any'}</td>
                  <td className="py-2 pr-4">{seg.demandCount}</td>
                  <td className="py-2 pr-4">
                    <span className={seg.gap ? 'text-amber-600 font-medium' : ''}>{seg.supplyCount}</span>
                  </td>
                  <td className="py-2">
                    {seg.gap && (
                      <button
                        type="button"
                        disabled={!!triggering}
                        onClick={() => triggerScrape(seg)}
                        className="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" />
                        {triggering === seg.label ? 'Triggering…' : 'Deep Scrape'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.segments.length === 0 && (
            <p className="py-6 text-center text-slate-500">No active research projects. Start a hunt to see demand segments.</p>
          )}
        </div>
      </section>

      {d.gaps.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Gap Alerts
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            These niches have fewer than {d.gapThreshold} experts. Trigger Deep Scrape to replenish.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-amber-900">
            {d.gaps.map((g) => (
              <li key={g.label || g.industry + g.subIndustry + g.region}>
                {g.label} — Supply: {g.supplyCount}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
