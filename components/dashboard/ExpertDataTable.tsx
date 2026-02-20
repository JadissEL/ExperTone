'use client';

import React, { useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Globe } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';

interface ExpertRow {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  country?: string;
  region?: string;
  seniorityScore?: number;
  yearsExperience?: number;
  matchScore?: number;
  predictedRate: number;
  source: 'agent' | 'internal';
  visibilityStatus: string;
  reputationScore?: number | null;
  gapPercent?: number;
  averageActualRate?: number | null;
  hasProvenMastery?: boolean;
  reacquisitionPriority?: boolean;
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-expert-sage-muted flex items-center justify-center text-xs font-medium text-expert-sage flex-shrink-0">
      {initial}
    </div>
  );
}

function MatchRing({ score }: { score?: number }) {
  const pct = score !== undefined ? Math.round(score * 100) : 0;
  const dash = 2 * Math.PI * 10;
  const offset = dash - (pct / 100) * dash;
  return (
    <div className="relative w-7 h-7 flex-shrink-0">
      <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-expert-navy-muted" />
        <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={dash} strokeDashoffset={offset} className="text-expert-sage transition-all duration-300" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-300">{pct}</span>
    </div>
  );
}

function RateTooltip({ rate, matchScore }: { rate: number; matchScore?: number }) {
  const [show, setShow] = useState(false);
  const confidence = matchScore != null ? Math.round(matchScore * 100) : 75;
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-slate-300 font-medium tabular-nums">${rate?.toFixed(0)}/hr</span>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.2 }}
            className="absolute left-0 bottom-full mb-1 z-50 px-2.5 py-1.5 rounded-bento-sm bg-slate-800/95 backdrop-blur-[12px] border border-expert-frost-border text-xs text-slate-200 shadow-float whitespace-nowrap"
          >
            ML confidence: {confidence}%
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OwnershipBadge({ status }: { status: string }) {
  const isPrivate = status === 'PRIVATE';
  return (
    <motion.span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isPrivate ? 'bg-expert-frost border border-expert-frost-border text-slate-300' : 'bg-expert-sage-muted text-expert-sage'
      }`}
      whileHover={isPrivate ? { scale: 1.03 } : {}}
      transition={{ type: 'spring', bounce: 0.2 }}
    >
      {isPrivate && <Lock className="w-3 h-3 opacity-80" />}
      {!isPrivate && <Globe className="w-3 h-3 opacity-80" />}
      {status === 'GLOBAL_POOL' ? 'Global' : 'Private'}
    </motion.span>
  );
}

const columnHelper = createColumnHelper<ExpertRow>();

const columns: ColumnDef<ExpertRow, unknown>[] = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={(e) => table.toggleAllRowsSelected(e.target.checked)} className="rounded border-expert-navy-muted bg-expert-navy/50" />
    ),
    cell: ({ row }) => (
      <input type="checkbox" checked={row.getIsSelected()} onChange={(e) => row.toggleSelected(e.target.checked)} className="rounded border-expert-navy-muted bg-expert-navy/50" onClick={(e) => e.stopPropagation()} />
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <Avatar name={row.original.name} />
        <span className="font-medium text-slate-200 truncate">{row.original.name}</span>
      </div>
    ),
  }),
  columnHelper.accessor('industry', { header: 'Industry', cell: ({ getValue }) => <span className="text-slate-400 text-xs truncate max-w-[80px] block">{getValue() || '—'}</span> }),
  columnHelper.accessor('subIndustry', { header: 'Sub', cell: ({ getValue }) => <span className="text-slate-500 text-xs truncate max-w-[72px] block">{getValue() || '—'}</span> }),
  columnHelper.accessor('matchScore', { header: 'Match', cell: ({ row }) => <MatchRing score={row.original.matchScore} /> }),
  columnHelper.accessor('predictedRate', {
    header: 'Rate',
    cell: ({ row }) => <RateTooltip rate={row.original.predictedRate} matchScore={row.original.matchScore} />,
  }),
  columnHelper.accessor('reputationScore', {
    header: 'Trust',
    cell: ({ getValue }) => {
      const s = getValue();
      if (s == null) return <span className="text-slate-600">—</span>;
      const stars = Math.round(s * 5);
      return <span className="text-expert-amber-soft" title={`${(s * 100).toFixed(0)}%`}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>;
    },
  }),
  columnHelper.accessor('country', { header: 'Country', cell: ({ getValue }) => <span className="text-slate-500 text-xs truncate max-w-[64px] block">{getValue() || '—'}</span> }),
  columnHelper.accessor('region', { header: 'Region', cell: ({ getValue }) => <span className="text-slate-500 text-xs truncate max-w-[56px] block">{getValue() || '—'}</span> }),
  columnHelper.accessor('seniorityScore', { header: 'Sen.', cell: ({ getValue }) => <span className="text-slate-400 text-xs tabular-nums">{getValue() ?? '—'}</span> }),
  columnHelper.accessor('yearsExperience', { header: 'Yrs', cell: ({ getValue }) => <span className="text-slate-400 text-xs tabular-nums">{getValue() ?? '—'}</span> }),
  columnHelper.display({
    id: 'deepIntelligence',
    header: 'Deep Intelligence',
    cell: ({ row }) => {
      const e = row.original;
      const gap = e.gapPercent ?? 0;
      const gapOver20 = gap > 20;
      const hasActual = e.averageActualRate != null && e.averageActualRate > 0;
      return (
        <div className="flex flex-col gap-0.5 text-[11px]">
          {hasActual && (
            <span className={gapOver20 ? 'text-red-400 font-medium' : 'text-slate-400'}>Gap: {gap.toFixed(0)}%{gapOver20 ? ' (>20%)' : ''}</span>
          )}
          {e.hasProvenMastery && <span className="px-1.5 py-0.5 rounded-full bg-expert-sage-muted text-expert-sage w-fit">Proven Mastery</span>}
          {e.reacquisitionPriority && <span className="px-1.5 py-0.5 rounded-full bg-expert-amber-muted text-expert-amber-soft w-fit">Re-acquire</span>}
          {!hasActual && !e.hasProvenMastery && !e.reacquisitionPriority && <span className="text-slate-600">—</span>}
        </div>
      );
    },
  }),
  columnHelper.accessor('source', {
    header: 'Source',
    cell: ({ getValue }) => (
      <span className={`text-[11px] px-2 py-0.5 rounded-full ${getValue() === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600/30 text-slate-400'}`}>
        {getValue() === 'agent' ? 'n8n' : 'Internal'}
      </span>
    ),
  }),
  columnHelper.accessor('visibilityStatus', {
    header: 'Ownership',
    cell: ({ getValue }) => <OwnershipBadge status={getValue()} />,
  }),
] as ColumnDef<ExpertRow, unknown>[];

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, type: 'spring' as const, bounce: 0.2, stiffness: 400, damping: 30 },
  }),
};

export function ExpertDataTable() {
  const { activeProjectId, expertsVersion, setSelectedExpert } = useDashboardStore();
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    setLoading(true);
    const url = activeProjectId ? `/api/experts?projectId=${activeProjectId}` : '/api/experts';
    fetch(url, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setExperts(d.experts ?? []))
      .catch(() => setExperts([]))
      .finally(() => setLoading(false));
  }, [activeProjectId, expertsVersion]);

  const table = useReactTable({
    data: experts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="glass-dark rounded-bento p-4 h-full flex flex-col min-h-[200px] shadow-glass-soft">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-slate-200">Expert Grid</span>
        <input
          type="text"
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-bento-sm bg-expert-navy/60 border border-expert-frost-border text-sm text-slate-300 placeholder-slate-500 w-36 focus:outline-none focus:ring-1 focus:ring-expert-sage/40"
        />
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <div className="space-y-0.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                className="h-9 rounded-bento-sm bg-expert-navy/50 border border-expert-frost-border"
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="text-left py-1.5 px-2 text-slate-500 font-medium text-xs sticky top-0 bg-expert-navy-deep/95 backdrop-blur-[12px] z-10">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <motion.tbody initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } } }}>
              {rows.map((row, i) => (
                <motion.tr
                  key={row.id}
                  variants={rowVariants}
                  custom={i}
                  onClick={() =>
                    setSelectedExpert({
                      id: row.original.id,
                      name: row.original.name,
                      industry: row.original.industry,
                      subIndustry: row.original.subIndustry,
                      country: row.original.country ?? '',
                      region: row.original.region ?? '',
                      seniorityScore: row.original.seniorityScore ?? 50,
                      yearsExperience: row.original.yearsExperience ?? 5,
                      predictedRate: row.original.predictedRate,
                      visibilityStatus: row.original.visibilityStatus,
                    })
                  }
                  className="border-t border-expert-frost-border/50 hover:bg-expert-frost/50 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-1.5 px-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        )}
      </div>
      {!loading && experts.length === 0 && (
        <p className="text-slate-500 text-center py-4 text-sm">No experts. Select a project or add experts.</p>
      )}
    </div>
  );
}
