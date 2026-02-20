'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Lock, UserPlus, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResearchStore } from '@/stores/useResearchStore';
import type { ResearchExpert, VisibilityStatus } from '@/types/expert';
import { cn } from '@/lib/utils';

function SemanticScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const variant =
    pct >= 90 ? 'emerald' : pct >= 70 ? 'amber' : 'secondary';
  return (
    <Badge variant={variant} className="font-mono">
      {pct}%
    </Badge>
  );
}

function OwnershipBadge({
  visibilityStatus,
  ownerName,
  isExisting,
}: {
  visibilityStatus: VisibilityStatus;
  ownerName?: string | null;
  isExisting: boolean;
}) {
  if (visibilityStatus === 'PRIVATE' && ownerName) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-700">
        <Lock className="h-3 w-3" />
        {ownerName}
      </span>
    );
  }
  if (visibilityStatus === 'GLOBAL_POOL') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-purple-700">
        <CheckCircle className="h-3 w-3" />
        Global Pool
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
      <UserPlus className="h-3 w-3" />
      New
    </span>
  );
}

const columnHelper = createColumnHelper<ResearchExpert>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
          {row.original.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-900">{row.original.name}</p>
          <p className="text-xs text-slate-500">
            {row.original.industry} · {row.original.subIndustry}
          </p>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('similarityScore', {
    header: 'Match',
    cell: ({ getValue }) => <SemanticScoreBadge score={getValue() ?? 0} />,
  }),
  columnHelper.accessor('predictedRate', {
    header: 'Rate',
    cell: ({ row }) => (
      <span
        title={`Confidence: ${(row.original.rateConfidence ?? 0) * 100}%`}
        className="cursor-help text-sm font-medium"
      >
        ${row.original.predictedRate.toFixed(0)}/hr
      </span>
    ),
  }),
  columnHelper.display({
    id: 'ownership',
    header: 'Ownership',
    cell: ({ row }) => (
      <OwnershipBadge
        visibilityStatus={row.original.visibilityStatus}
        ownerName={row.original.ownerName}
        isExisting={row.original.isExisting}
      />
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const expert = row.original;
      const isExisting = expert.isExisting;
      const isOwned = expert.visibilityStatus === 'PRIVATE' && expert.ownerId;

      if (isExisting && isOwned) {
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              useResearchStore.getState().setOpenTicketFor({
                expertId: expert.id,
                ownerId: expert.ownerId ?? '',
                ownerName: expert.ownerName ?? undefined,
              });
            }}
          >
            Request Access
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            useResearchStore.getState().setSelectedExpertId(expert.id);
          }}
        >
          Claim
        </Button>
      );
    },
  }),
] as ColumnDef<ResearchExpert, unknown>[];

export function ExpertMasterTable() {
  const { results, uiState, setSelectedExpertId } = useResearchStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 p-2">
        <Input
          placeholder="Search experts..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-64 text-sm"
        />
        <span className="text-xs text-slate-500">
          {results.length} expert{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        ref={parentRef}
        className="min-h-[300px] flex-1 overflow-auto"
        style={{ contain: 'strict' }}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="border-b border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-500"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
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
            {virtualRows.length === 0 && results.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-500">
                  No experts. Run a research to populate.
                </td>
              </tr>
            ) : (
              virtualRows.map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    onClick={() => setSelectedExpertId(row.original.id)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={cn(
                      'cursor-pointer border-b border-slate-100 bg-white transition-colors hover:bg-slate-50',
                      row.original.isExisting && 'bg-amber-50/50',
                      uiState.selectedExpertId === row.original.id && 'bg-blue-50'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
