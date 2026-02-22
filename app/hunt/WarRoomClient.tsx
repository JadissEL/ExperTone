'use client';

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Plus, Zap, Loader2, AlertTriangle } from 'lucide-react';
import { SPRING, STAGGER } from '@/lib/vanguard/motion';
import { ClickableName } from '@/components/expert/ClickableName';
import { DisambiguationModal } from '@/components/expert/DisambiguationModal';
import { WarRoomExpertProfileSheet } from '@/components/expert/WarRoomExpertProfileSheet';

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
  sourceVerified?: boolean | null;
}

/** Aether: Glowing neon scent pills — A:Social B:IP C:Market D:Internal */
function ScentPills({ trails }: { trails: ScentTrails }) {
  const pills = [
    { key: 'A', active: trails.trailA, color: 'bg-blue-500', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.6)]' },
    { key: 'B', active: trails.trailB, color: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]' },
    { key: 'C', active: trails.trailC, color: 'bg-amber-500', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]' },
    { key: 'D', active: trails.trailD, color: 'bg-violet-500', glow: 'shadow-[0_0_8px_rgba(168,85,247,0.6)]' },
  ];
  return (
    <div className="flex gap-1 w-20 items-center justify-center" title="A:Social B:IP C:Market D:Internal">
      {pills.map((p) => (
        <span
          key={p.key}
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
            p.active ? `${p.color} ${p.glow} text-white` : 'bg-white/5 text-slate-500 border border-white/10'
          }`}
        >
          {p.key}
        </span>
      ))}
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
  const [addError, setAddError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [profileExpertId, setProfileExpertId] = useState<string | null>(null);
  const [disambiguation, setDisambiguation] = useState<{
    candidates: Array<{
      id: string;
      expertId: string;
      photoUrl: string | null;
      headline: string;
      company: string;
      location: string;
      industry: string;
      education: string;
      summary: string;
      matchScore: number;
      confidence: number;
    }>;
    name: string;
  } | null>(null);
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
    let cancelled = false;
    fetch('/api/projects', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list = d.projects ?? [];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) setSelectedProjectId(list[0].id);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[WarRoom] Projects fetch failed:', err);
        }
      });
    return () => {
      cancelled = true;
    };
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
          const msg = [d.error, d.hint].filter(Boolean).join(' — ') || 'Trigger failed';
          setTriggerMessage({ type: 'error', text: msg });
        }
        setTimeout(() => setTriggerMessage(null), 8000);
      })
      .catch((err) => {
        setTriggerMessage({ type: 'error', text: err instanceof Error ? err.message : 'Request failed' });
        setTimeout(() => setTriggerMessage(null), 5000);
      })
      .finally(() => setTriggerLoading(false));
  };

  const handleAddToProject = (row: HunterRow) => {
    const pid = selectedProjectId;
    if (!pid) {
      setAddError('Please select a project first.');
      setTimeout(() => setAddError(null), 4000);
      return;
    }
    setAddError(null);
    setAddLoading(row.id);
    fetch('/api/hunter/add-to-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectId: pid, expertId: row.id, matchScore: row.matchScore }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok) {
          setAddedIds((prev: Set<string>) => new Set(prev).add(row.id));
        } else {
          const msg = d.error ?? d.details ?? `Failed to add (${r.status})`;
          setAddError(msg);
          setTimeout(() => setAddError(null), 5000);
        }
      })
      .catch((err) => {
        setAddError(err instanceof Error ? err.message : 'Request failed');
        setTimeout(() => setAddError(null), 5000);
      })
      .finally(() => setAddLoading(null));
  };

  return (
    <div className="h-full flex flex-col bg-aether-base text-slate-100 font-sans" style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      {/* Aether: Floating command bar — glassmorphism */}
      <div className="flex items-center gap-4 px-4 py-3 shrink-0">
        <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 min-w-0 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl px-3 sm:px-4 py-2.5 shadow-[0_0_40px_-8px_rgba(99,102,241,0.2)]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Client brief (e.g. supply chain VP, 15+ years)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Name filter (fuzzy)"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-24 sm:w-32 px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-aether-violet/20"
          />
          <motion.button
            type="button"
            onClick={runSearch}
            disabled={loading || !query.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING.snappy}
            className="px-4 py-2 text-sm font-medium bg-aether-emerald text-slate-900 rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-emerald"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Search'}
          </motion.button>
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-2xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
          title={projects.length === 0 ? 'Create a project first at /projects' : undefined}
        >
          <option value="">
            {projects.length === 0 ? 'No projects — create one' : 'Select project'}
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        {projects.length === 0 && (
          <a
            href="/projects"
            className="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Create project
          </a>
        )}
        <motion.button
          type="button"
          onClick={handleTrigger}
          disabled={triggerLoading || !query.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING.snappy}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-2xl border border-amber-400/50 disabled:opacity-50 shadow-[0_0_24px_-4px_rgba(245,158,11,0.3)]"
        >
          {triggerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Hunter Trigger
        </motion.button>
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

      {addError && (
        <div className="px-3 py-2 text-xs shrink-0 bg-amber-900/50 text-amber-300 border-b border-amber-700/50 flex items-center justify-between gap-2">
          <span>{addError}</span>
          <button type="button" onClick={() => setAddError(null)} className="text-amber-400 hover:text-amber-200">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead className="sticky top-0 bg-aether-base/90 backdrop-blur-xl border-b border-white/10 z-10">
            <tr className="text-slate-400 font-medium">
              <th className="text-left py-2 px-3 w-20">Match</th>
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
            {results.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING.apex, delay: i * STAGGER.apexDelay }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                className="border-b border-white/5"
              >
                <td className="py-2 px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-lg font-semibold tabular-nums ${
                      row.matchScore >= 0.85
                        ? 'bg-gradient-to-r from-violet-500/30 to-blue-500/30 text-violet-200 shadow-[0_0_12px_-2px_rgba(168,85,247,0.3)]'
                        : row.matchScore >= 0.65
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {row.matchScore.toFixed(2)}
                  </span>
                  {row.unfindableBoost && <span className="ml-1 text-[9px] text-amber-400" title="Hidden Gem">+25%</span>}
                </td>
                <td className="py-2 px-3 text-slate-300 tabular-nums">${row.predictedRate?.toFixed(0) ?? '-'}/hr</td>
                <td className="py-2 px-3 text-slate-400">
                  {row.lastEngagement ? new Date(row.lastEngagement).toLocaleDateString() : '—'}
                </td>
                <td className="py-2 px-3">
                  <ScentPills trails={row.scentTrails} />
                </td>
                <td className="py-1 px-2">
                  <div className="flex items-center gap-1.5">
                    <ClickableName
                      name={row.name}
                      expertId={row.id}
                      matchScore={row.matchScore}
                      projectId={selectedProjectId || undefined}
                      onResolved={(id) => setProfileExpertId(id)}
                      onDisambiguation={(candidates, name) =>
                        setDisambiguation({ candidates, name })
                      }
                      className="text-slate-200 font-medium hover:text-emerald-300"
                    >
                      {row.name}
                    </ClickableName>
                    {row.sourceVerified === false && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-900/60 text-amber-300 border border-amber-700/50"
                        title="Unverified: created from input only, no scraped sources"
                      >
                        Unverified
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-slate-400 truncate max-w-[10rem]" title={row.subIndustry}>{row.industry}</td>
                <td className="py-2 px-3">
                  {row.seniorityFlag === 'DISCREPANCY' ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-400" title="Years of experience differ across sources">
                      <AlertTriangle className="w-3 h-3" /> Diff
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {addedIds.has(row.id) ? (
                    <span className="text-[10px] text-emerald-400 font-medium">Added</span>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={() => handleAddToProject(row)}
                      disabled={!selectedProjectId || addLoading === row.id}
                      title={!selectedProjectId ? 'Select a project first' : 'Add expert to project'}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      transition={SPRING.snappy}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/90 text-white shadow-[0_0_24px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_0_32px_-4px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_0_24px_-4px_rgba(16,185,129,0.5)]"
                    >
                      {addLoading === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </motion.button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <DisambiguationModal
        open={!!disambiguation}
        onOpenChange={(o) => !o && setDisambiguation(null)}
        name={disambiguation?.name ?? ''}
        candidates={disambiguation?.candidates ?? []}
        onSelect={(id) => {
          setProfileExpertId(id);
          setDisambiguation(null);
        }}
      />

      <WarRoomExpertProfileSheet
        expertId={profileExpertId}
        onClose={() => setProfileExpertId(null)}
      />

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
