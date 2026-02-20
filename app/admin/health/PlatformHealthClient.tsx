'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Zap, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface HealthData {
  conversion: {
    newExpertsLast30Days: number;
    verifiedByCsaLast30Days: number;
    conversionRatePct: number;
  };
  systemRoi: {
    totalExperts: number;
    globalPoolCount: number;
    predictedVsSuggestedAccuracyPct: number | null;
  };
  searchLatency: {
    mlServiceMs: number | null;
    grokEmbeddingMs: number | null;
  };
}

interface SystemHealthCheck {
  pgvectorOptimized: boolean;
  orphanedExpertsCount: number;
  mlHeartbeatStable: boolean;
  graphReflectsEngagements: { lastEngagementAt: string | null; engagementCount: number };
}

export function PlatformHealthClient() {
  const [data, setData] = useState<HealthData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, systemRes] = await Promise.all([
        fetch('/api/admin/analytics/health', { credentials: 'include' }),
        fetch('/api/system/health', { credentials: 'include' }),
      ]);
      if (!healthRes.ok) throw new Error(healthRes.statusText);
      const json = await healthRes.json();
      setData(json);
      if (systemRes.ok) {
        const sys = await systemRes.json();
        setSystemHealth(sys);
      } else {
        setSystemHealth(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading && !data) {
    return (
      <div className="mt-6 flex items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-slate-500">
        Loading platform health...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
        <button
          type="button"
          onClick={fetchHealth}
          className="ml-2 text-sm underline"
        >
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
          onClick={fetchHealth}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          Conversion Metrics
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          New experts (from n8n) successfully verified by CSAs (moved to Global Pool)
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">New experts (last 30 days)</p>
            <p className="text-2xl font-semibold text-slate-900">
              {d.conversion.newExpertsLast30Days}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Verified by CSA (last 30 days)</p>
            <p className="text-2xl font-semibold text-slate-900">
              {d.conversion.verifiedByCsaLast30Days}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Conversion rate</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {d.conversion.conversionRatePct}%
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DollarSign className="h-5 w-5 text-blue-500" />
          System ROI
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Predicted rate vs. ML suggested market rate accuracy (for model retraining)
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Total experts</p>
            <p className="text-2xl font-semibold text-slate-900">{d.systemRoi.totalExperts}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Global pool</p>
            <p className="text-2xl font-semibold text-slate-900">{d.systemRoi.globalPoolCount}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Predicted vs suggested accuracy</p>
            <p className="text-2xl font-semibold text-slate-900">
              {d.systemRoi.predictedVsSuggestedAccuracyPct != null
                ? `${d.systemRoi.predictedVsSuggestedAccuracyPct}%`
                : '—'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Zap className="h-5 w-5 text-amber-500" />
          Search Latency
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Response time of ML microservice and embedding API (Grok/OpenAI)
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">ML microservice</p>
            <p className="text-2xl font-semibold text-slate-900">
              {d.searchLatency.mlServiceMs != null
                ? `${d.searchLatency.mlServiceMs} ms`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Embedding API (Grok/OpenAI)</p>
            <p className="text-2xl font-semibold text-slate-900">
              {d.searchLatency.grokEmbeddingMs != null
                ? `${d.searchLatency.grokEmbeddingMs} ms`
                : '—'}
            </p>
          </div>
        </div>
      </section>

      {systemHealth && (
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            Elite Status Check
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            pgvector, orphaned experts, ML heartbeat, graph vs. engagements
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              {systemHealth.pgvectorOptimized ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              pgvector index: {systemHealth.pgvectorOptimized ? 'OK' : 'Not available'}
            </li>
            <li className="flex items-center gap-2">
              {systemHealth.orphanedExpertsCount === 0 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
              Orphaned experts (no owner, not global): {systemHealth.orphanedExpertsCount}
            </li>
            <li className="flex items-center gap-2">
              {systemHealth.mlHeartbeatStable ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              FastAPI ML heartbeat: {systemHealth.mlHeartbeatStable ? 'Stable' : 'Unreachable'}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-slate-400" />
              Relationship graph / engagements: {systemHealth.graphReflectsEngagements.engagementCount} engagements, last: {systemHealth.graphReflectsEngagements.lastEngagementAt ?? '—'}
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
