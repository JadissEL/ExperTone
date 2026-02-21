'use client';

import React, { useCallback, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, Zap, Loader2, AlertTriangle } from 'lucide-react';

type ScentTrails = { trailA?: boolean; trailB?: boolean; trailC?: boolean; trailD?: boolean };

interface HunterRow {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  country: string;
  seniorityScore: number;
  yearsExperience: number;
  predictedRate: number;
  averageActualRate?: number | null;
  matchScore: number;
  originalSimilarity: number;
  unfindableBoost: boolean;
  lastEngagement: string | null;
  scentTrails: ScentTrails;
  seniorityFlag: string | null;
}

function ScentSparkline({ trails }: { trails: ScentTrails }) {
  const a = trails.trailA ? 1 : 0;
  const b = trails.trailB ? 1 : 0;
  const c = trails.trailC ? 1 : 0;
  const d = trails.trailD ? 1 : 0;
  const total = a + b + c + d || 1;
  return (
    <div className="flex gap-0.5 w-16 h-4 items-center" title="A:Social B:IP C:Market D:Internal">
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1 rounded-sm bg-slate-700 overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${(a / total) * 100}%` }} />
        </div>
        <span className="text-[9px] text-slate-500">A</span>
      </div>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1 rounded-sm bg-slate-700 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${(b / total) * 100}%` }} />
        </div>
        <span className="text-[9px] text-slate-500">B</span>
      </div>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1 rounded-sm bg-slate-700 overflow-hidden">
          <div className="h-full bg-amber-500" style={{ width: `${(c / total) * 100}%` }} />
        </div>
        <span className="text-[9px] text-slate-500">C</span>
      </div>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1 rounded-sm bg-slate-700 overflow-hidden">
          <div className="h-full bg-violet-500" style={{ width: `${(d / total) * 100}%` }} />
        </div>
        <span className="text-[9px] text-slate-500">D</span>
      </div>
    </div>
  );
}

export function WarRoomClient() {
  const [query, setQuery] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<HunterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [addLoading, setAddLoading] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const pageSize = 50;

  const runSearch = useCallback(() => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchError(null);
    fetch('/api/hunter/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query: query.trim(), page: 1, pageSize, nameFilter: nameFilter.trim() || undefined }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          const msg = [d.details, d.error, d.hint].filter(Boolean).join(' — ') || `Search failed (${r.status})`;
          throw new Error(msg);
        }
        return d;
      })
      .then((d) => {
        if (d.results) {
          setResults(d.results);
          setTotal(d.total ?? 0);
          setTotalPages(d.totalPages ?? 0);
          setPage(1);
        }
      })
      .catch((err) => {
        setResults([]);
        setSearchError(err instanceof Error ? err.message : 'Failed to fetch results');
      })
      .finally(() => setLoading(false));
  }, [query, nameFilter]);

  const fetchPage = useCallback(
    (p: number) => {
      if (!query.trim()) return;
      setLoading(true);
      setSearchError(null);
      fetch('/api/hunter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: query.trim(), page: p, pageSize, nameFilter: nameFilter.trim() || undefined }),
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) {
            const msg = [d.details, d.error, d.hint].filter(Boolean).join(' — ') || `Search failed (${r.status})`;
            throw new Error(msg);
          }
          return d;
        })
        .then((d) => {
          if (d.results) {
            setResults(d.results);
            setTotal(d.total ?? 0);
            setTotalPages(d.totalPages ?? 0);
            setPage(p);
          }
        })
        .catch((err) => setSearchError(err instanceof Error ? err.message : 'Failed to fetch'))
        .finally(() => setLoading(false));
    },
    [query, nameFilter]
  );

  React.useEffect(() => {
    fetch('/api/projects', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const list = d.projects ?? [];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) setSelectedProjectId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const handleTrigger = () => {
    setTriggerLoading(true);
    setTriggerMessage(null);
    fetch('/api/hunter/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query: query.trim(), projectId: selectedProjectId || undefined, projectTitle: query.slice(0, 80) }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        return { ok: r.ok, ...d };
      })
      .then((d) => {
        if (d.ok) {
          setTriggerMessage({ type: 'success', text: d.message ?? 'Hunter triggered. n8n agents running.' });
          runSearch();
        } else {
          setTriggerMessage({ type: 'error', text: d.error ?? 'Trigger failed' });
        }
        setTimeout(() => setTriggerMessage(null), 5000);
      })
      .catch((err) => {
        setTriggerMessage({ type: 'error', text: err instanceof Error ? err.message : 'Request failed' });
        setTimeout(() => setTriggerMessage(null), 5000);
      })
      .finally(() => setTriggerLoading(false));
  };

  const handleAddToProject = (row: HunterRow) => {
    const pid = selectedProjectId;
    if (!pid) return;
    setAddLoading(row.id);
    fetch('/api/hunter/add-to-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectId: pid, expertId: row.id, matchScore: row.matchScore }),
    })
      .then((r) => {
        if (r.ok) setAddedIds((prev: Set<string>) => new Set(prev).add(row.id));
      })
      .finally(() => setAddLoading(null));
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans" style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Client brief (e.g. supply chain VP, 15+ years)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <input
            type="text"
            placeholder="Name filter (fuzzy)"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-36 px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={loading || !query.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Search'}
          </button>
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-300 focus:outline-none"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleTrigger}
          disabled={triggerLoading || !query.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-slate-900 rounded border border-amber-500 disabled:opacity-50"
        >
          {triggerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Hunter Trigger
        </button>
      </div>

      {triggerMessage && (
        <div
          className={`px-3 py-1.5 text-xs shrink-0 ${
            triggerMessage.type === 'success' ? 'bg-emerald-900/50 text-emerald-300 border-b border-emerald-700/50' : 'bg-red-900/50 text-red-300 border-b border-red-700/50'
          }`}
        >
          {triggerMessage.text}
        </div>
      )}

      {searchError && (
        <div className="px-3 py-2 text-xs shrink-0 bg-red-900/50 text-red-300 border-b border-red-700/50 flex items-center justify-between gap-2">
          <span>{searchError}</span>
          <button type="button" onClick={() => setSearchError(null)} className="text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
            <tr className="text-slate-400 font-medium">
              <th className="text-left py-1.5 px-2 w-20">Match</th>
              <th className="text-left py-1.5 px-2 w-20">Rate</th>
              <th className="text-left py-1.5 px-2 w-24">Last Eng.</th>
              <th className="text-left py-1.5 px-2 w-20">Scent</th>
              <th className="text-left py-1.5 px-2">Name</th>
              <th className="text-left py-1.5 px-2 w-28">Industry</th>
              <th className="text-left py-1.5 px-2 w-16">Flag</th>
              <th className="text-left py-1.5 px-2 w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {searchError ? (
                    <span className="text-red-400">{searchError}</span>
                  ) : (
                    'Enter a client brief and click Search or Hunter Trigger.'
                  )}
                </td>
              </tr>
            )}
            {results.map((row) => (
              <tr key={row.id} className="border-b border-slate-800/80 hover:bg-slate-800/50">
                <td className="py-1 px-2">
                  <span className="font-semibold text-slate-100 tabular-nums">{row.matchScore.toFixed(2)}</span>
                  {row.unfindableBoost && <span className="ml-0.5 text-[9px] text-amber-400" title="Hidden Gem">+25%</span>}
                </td>
                <td className="py-1 px-2 text-slate-300 tabular-nums">${row.predictedRate?.toFixed(0) ?? '-'}/hr</td>
                <td className="py-1 px-2 text-slate-400">
                  {row.lastEngagement ? new Date(row.lastEngagement).toLocaleDateString() : '—'}
                </td>
                <td className="py-1 px-2">
                  <ScentSparkline trails={row.scentTrails} />
                </td>
                <td className="py-1 px-2 text-slate-200 font-medium">{row.name}</td>
                <td className="py-1 px-2 text-slate-400 truncate max-w-[10rem]" title={row.subIndustry}>{row.industry}</td>
                <td className="py-1 px-2">
                  {row.seniorityFlag === 'DISCREPANCY' ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-400" title="Years of experience differ across sources">
                      <AlertTriangle className="w-3 h-3" /> Diff
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-1 px-2">
                  {addedIds.has(row.id) ? (
                    <span className="text-[10px] text-emerald-400 font-medium">Added</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToProject(row)}
                      disabled={!selectedProjectId || addLoading === row.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-700 hover:bg-emerald-600 text-white rounded border border-emerald-600 disabled:opacity-50"
                    >
                      {addLoading === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800 shrink-0">
          <span className="text-xs text-slate-500">
            {total} expert{total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
