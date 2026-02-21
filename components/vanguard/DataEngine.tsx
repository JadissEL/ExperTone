'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
  type ColumnSizingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { useVanguardStore } from '@/stores/vanguardStore';
import type { VanguardFilters } from '@/stores/vanguardStore';
import { OwnershipBadge } from './OwnershipBadge';
import { useReducedMotion, getTransition } from '@/lib/vanguard/reduced-motion';
import { SPRING, STAGGER } from '@/lib/vanguard/motion';

function filterExperts(experts: ExpertRow[], filters: VanguardFilters): ExpertRow[] {
  return experts.filter((e) => {
    const q = (filters.query || '').toLowerCase();
    if (q && !e.name.toLowerCase().includes(q) && !e.industry.toLowerCase().includes(q) && !(e.subIndustry || '').toLowerCase().includes(q) && !(e.country || '').toLowerCase().includes(q) && !(e.region || '').toLowerCase().includes(q)) return false;
    const ind = (filters.industry || '').trim().toLowerCase();
    if (ind && !e.industry.toLowerCase().includes(ind)) return false;
    const sub = (filters.subIndustry || '').trim().toLowerCase();
    if (sub && !(e.subIndustry || '').toLowerCase().includes(sub)) return false;
    const reg = (filters.region || '').trim().toLowerCase();
    if (reg && !(e.region || '').toLowerCase().includes(reg)) return false;
    const ctry = (filters.country || '').trim().toLowerCase();
    if (ctry && !(e.country || '').toLowerCase().includes(ctry)) return false;
    if (filters.rateMin != null && e.predictedRate < filters.rateMin) return false;
    if (filters.rateMax != null && e.predictedRate > filters.rateMax) return false;
    if (filters.seniorityMin != null && (e.seniorityScore ?? 0) < filters.seniorityMin) return false;
    if (filters.seniorityMax != null && (e.seniorityScore ?? 100) > filters.seniorityMax) return false;
    if (filters.availability?.length) {
      const days = e.lastContactUpdate ? Math.floor((Date.now() - new Date(e.lastContactUpdate).getTime()) / (24 * 60 * 60 * 1000)) : 999;
      const status = days <= 7 ? 'Active' : days <= 30 ? 'Recent' : 'Stale';
      if (!filters.availability.includes(status)) return false;
    }
    if (filters.mnpiRisk?.length) {
      const level = !e.mnpiRiskLevel ? 'None' : e.mnpiRiskLevel.toUpperCase().includes('HIGH') ? 'High' : 'Low';
      if (!filters.mnpiRisk.includes(level)) return false;
    }
    return true;
  });
}

interface ExpertRow {
  id: string;
  name: string;
  industry: string;
  subIndustry?: string;
  country?: string;
  region?: string;
  seniorityScore?: number;
  yearsExperience?: number;
  predictedRate: number;
  visibilityStatus: string;
  matchScore?: number;
  source?: 'agent' | 'internal';
  totalEngagements?: number;
  mnpiRiskLevel?: string | null;
  lastContactUpdate?: string | null;
}

const columnHelper = createColumnHelper<ExpertRow>();

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-expert-emerald-muted flex items-center justify-center text-xs font-medium text-expert-emerald flex-shrink-0">
      {initial}
    </div>
  );
}

function AvailabilityIndicator({ lastContactUpdate }: { lastContactUpdate?: string | null }) {
  if (!lastContactUpdate) return <span className="text-slate-600 text-[11px]">—</span>;
  const days = Math.floor((Date.now() - new Date(lastContactUpdate).getTime()) / (24 * 60 * 60 * 1000));
  const status = days <= 7 ? 'available' : days <= 30 ? 'recent' : 'stale';
  const label = days <= 7 ? 'Active' : days <= 30 ? 'Recent' : 'Stale';
  const color =
    status === 'available'
      ? 'text-expert-emerald'
      : status === 'recent'
        ? 'text-expert-amber-warning'
        : 'text-slate-500';
  return <span className={`text-[11px] font-medium ${color}`}>{label}</span>;
}

function RiskFlag({ level }: { level?: string | null }) {
  if (!level) return <span className="text-slate-600 text-[11px]">—</span>;
  const isHigh = level.toUpperCase().includes('HIGH');
  return (
    <span
      className={`text-[11px] px-1.5 py-0.5 rounded ${
        isHigh ? 'bg-expert-amber-muted text-expert-amber-warning' : 'bg-expert-frost/50 text-slate-400'
      }`}
    >
      {isHigh ? 'Risk' : level}
    </span>
  );
}

const columns: ColumnDef<ExpertRow, unknown>[] = [
  columnHelper.accessor('name', {
    header: 'Name',
    size: 180,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <Avatar name={row.original.name} />
        <span className="font-medium text-slate-200 truncate">{row.original.name}</span>
      </div>
    ),
  }),
  columnHelper.accessor('industry', {
    header: 'Industry',
    size: 100,
    cell: ({ getValue }) => (
      <span className="text-slate-400 text-xs truncate max-w-[80px] block">{getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('country', {
    header: 'Country',
    size: 80,
    cell: ({ getValue }) => (
      <span className="text-slate-500 text-xs truncate max-w-[64px] block">{getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('predictedRate', {
    header: 'Rate',
    size: 90,
    cell: ({ getValue }) => (
      <span className="text-slate-300 font-medium tabular-nums">${getValue()?.toFixed(0) ?? '—'}/hr</span>
    ),
  }),
  columnHelper.accessor('visibilityStatus', {
    header: 'Ownership',
    size: 100,
    cell: ({ getValue }) => <OwnershipBadge status={getValue()} />,
  }),
  columnHelper.accessor('lastContactUpdate', {
    header: 'Availability',
    size: 80,
    cell: ({ getValue }) => <AvailabilityIndicator lastContactUpdate={getValue()} />,
  }),
  columnHelper.accessor('mnpiRiskLevel', {
    header: 'Risk',
    size: 70,
    cell: ({ getValue }) => <RiskFlag level={getValue()} />,
  }),
  columnHelper.accessor('totalEngagements', {
    header: 'Engagements',
    size: 90,
    cell: ({ getValue }) => (
      <span className="text-slate-400 text-xs tabular-nums">{getValue() ?? 0}</span>
    ),
  }),
  columnHelper.accessor('source', {
    header: 'Source',
    size: 80,
    cell: ({ getValue }) => (
      <span
        className={`text-[11px] px-2 py-0.5 rounded-full ${
          getValue() === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600/30 text-slate-400'
        }`}
      >
        {getValue() === 'agent' ? 'n8n' : 'Internal'}
      </span>
    ),
  }),
];

export function DataEngine() {
  const reducedMotion = useReducedMotion();
  const activeProjectId = useVanguardStore((s) => s.activeProjectId);
  const setActiveExpert = useVanguardStore((s) => s.setActiveExpert);
  const setResultCount = useVanguardStore((s) => s.setResultCount);
  const filters = useVanguardStore((s) => s.filters);
  const setScrollDepth = useVanguardStore((s) => s.setScrollDepth);
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const url = activeProjectId ? `/api/experts?projectId=${activeProjectId}` : '/api/experts';
    fetch(url, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const list = d.experts ?? [];
        setExperts(list);
        setResultCount(list.length);
      })
      .catch(() => {
        setExperts([]);
        setResultCount(0);
      })
      .finally(() => setLoading(false));
  }, [activeProjectId, setResultCount]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      const depth = maxScroll > 0 ? Math.min(1, scrollTop / maxScroll) : 0;
      setScrollDepth(depth);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [setScrollDepth]);

  const filteredExperts = React.useMemo(() => filterExperts(experts, filters), [experts, filters]);

  const table = useReactTable({
    data: filteredExperts,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 50, maxSize: 400 },
  });

  const rows = table.getRowModel().rows;
  useEffect(() => {
    setResultCount(rows.length);
  }, [rows.length, setResultCount]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col glass-dark rounded-lg overflow-hidden min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <div className="h-8 rounded bg-expert-navy/50 animate-pulse mb-3 w-3/4" />
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <motion.div
                key={i}
                className="h-11 rounded-md bg-expert-navy/50 flex gap-4 items-center px-3"
                initial={{ opacity: 0.4 }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
              >
                <div className="w-7 h-7 rounded-full bg-expert-navy/80 shrink-0" />
                <div className="h-3 w-24 rounded bg-expert-navy/80 shrink-0" />
                <div className="h-3 w-16 rounded bg-expert-navy/80 shrink-0" />
                <div className="h-3 w-12 rounded bg-expert-navy/80 shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col glass-dark rounded-lg overflow-hidden min-h-0">
      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto" style={{ contain: 'strict' }}>
        <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="vanguard-blur bg-expert-navy/95 border-b border-expert-frost-border">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className="relative text-left py-2.5 px-3 text-slate-500 font-medium text-xs group"
                  >
                    <div
                      className="cursor-pointer select-none hover:text-slate-300"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[h.column.getIsSorted() as string] ?? null}
                    </div>
                    <div
                      onMouseDown={h.getResizeHandler()}
                      onTouchStart={h.getResizeHandler()}
                      className={`absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent hover:bg-expert-emerald/30 transition-colors ${
                        h.column.getIsResizing() ? 'bg-expert-emerald/50' : ''
                      }`}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualRows.length === 0 && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 px-6">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING.default}
                    className="flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-expert-frost/50 flex items-center justify-center mb-4">
                      <span className="text-2xl text-slate-500">—</span>
                    </div>
                    <p className="text-slate-400 font-medium mb-1">No experts yet</p>
                    <p className="text-slate-500 text-sm mb-4 max-w-[240px]">
                      Select a project to see matched experts, or run research to discover new ones.
                    </p>
                    <div className="flex gap-2">
                      <a
                        href="/projects"
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-expert-emerald/20 text-expert-emerald border border-expert-emerald/40 hover:bg-expert-emerald/30 transition-colors"
                      >
                        View projects
                      </a>
                      <a
                        href="/hunt"
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-expert-frost/50 text-slate-400 border border-expert-frost-border hover:text-slate-200 transition-colors"
                      >
                        Apex Hunter
                      </a>
                    </div>
                  </motion.div>
                </td>
              </tr>
            ) : (
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                return (
                  <motion.tr
                    key={row.id}
                    layout
                    initial={reducedMotion ? false : { opacity: 0, y: STAGGER.gridInitial.y }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { ...SPRING.default, delay: virtualRow.index * STAGGER.gridDelay }
                    }
                    onClick={() =>
                      setActiveExpert({
                        id: row.original.id,
                        name: row.original.name,
                        industry: row.original.industry,
                        subIndustry: row.original.subIndustry,
                        country: row.original.country,
                        region: row.original.region,
                        seniorityScore: row.original.seniorityScore,
                        yearsExperience: row.original.yearsExperience,
                        predictedRate: row.original.predictedRate,
                        visibilityStatus: row.original.visibilityStatus,
                        matchScore: row.original.matchScore,
                        source: row.original.source,
                      })
                    }
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translate3d(0,${virtualRow.start}px,0)`,
                    }}
                    className="border-b border-expert-frost-border/30 hover:bg-expert-frost/50 cursor-pointer transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ width: cell.column.getSize() }} className="py-2 px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
