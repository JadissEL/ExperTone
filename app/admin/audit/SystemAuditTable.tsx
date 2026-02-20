'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type AuditLogRow = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  targetId: string | null;
  action: string;
  metadata: unknown;
  createdAt: string;
};

const ACTIONS = [
  'OWNERSHIP_CHANGE',
  'TICKET_OPENED',
  'TICKET_RESOLVED',
  'DATA_EXPORT',
  'PROFILE_EDIT',
  'FORCE_EXPIRE',
  'BULK_RECLAIM',
  'AUTO_EXPIRY',
];

const columnHelper = createColumnHelper<AuditLogRow>();

const actionVariant: Record<string, 'default' | 'secondary' | 'emerald' | 'amber' | 'purple'> = {
  OWNERSHIP_CHANGE: 'purple',
  TICKET_OPENED: 'amber',
  TICKET_RESOLVED: 'emerald',
  DATA_EXPORT: 'secondary',
  PROFILE_EDIT: 'default',
  FORCE_EXPIRE: 'amber',
  BULK_RECLAIM: 'purple',
  AUTO_EXPIRY: 'amber',
};

export function SystemAuditTable() {
  const [actorFilter, setActorFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const params = new URLSearchParams();
  if (actorFilter) params.set('actorId', actorFilter);
  if (targetFilter) params.set('targetId', targetFilter);
  if (actionFilter) params.set('action', actionFilter);
  params.set('limit', '200');

  const { data, mutate } = useSWR<{ logs: AuditLogRow[] }>(
    `/api/admin/audit?${params.toString()}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const logs = data?.logs ?? [];

  const actorCounts = useMemo(() => {
    const m = new Map<string, number>();
    logs.forEach((l) => {
      const k = l.actorId ?? 'unknown';
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [logs]);

  const recentByActor = useMemo(() => {
    const byActor = new Map<string, AuditLogRow[]>();
    logs.forEach((l) => {
      const k = l.actorId ?? 'unknown';
      if (!byActor.has(k)) byActor.set(k, []);
      byActor.get(k)!.push(l);
    });
    const anomalous: string[] = [];
    byActor.forEach((arr, actorId) => {
      const recent = arr.filter(
        (a) => new Date(a.createdAt).getTime() > Date.now() - 10 * 60 * 1000
      );
      if (recent.length >= 50) anomalous.push(actorId);
    });
    return anomalous;
  }, [logs]);

  const columns: ColumnDef<AuditLogRow>[] = [
    columnHelper.accessor('createdAt', {
      header: 'Time',
      cell: ({ getValue }) => (
        <span className="text-slate-600 text-sm">
          {new Date(getValue()).toLocaleString()}
        </span>
      ),
    }),
    columnHelper.accessor('actorEmail', {
      header: 'Actor',
      cell: ({ row }) => {
        const email = row.original.actorEmail ?? row.original.actorId ?? '—';
        const isAnomalous = row.original.actorId && recentByActor.includes(row.original.actorId);
        return (
          <span className={isAnomalous ? 'text-amber-600 font-medium' : ''}>
            {email}
            {isAnomalous && (
              <Badge variant="destructive" className="ml-1 text-xs">
                Anomaly
              </Badge>
            )}
          </span>
        );
      },
    }),
    columnHelper.accessor('targetId', {
      header: 'Target',
      cell: ({ getValue }) => (
        <span className="text-slate-600 text-sm">{getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('action', {
      header: 'Action',
      cell: ({ getValue }) => (
        <Badge variant={actionVariant[getValue()] ?? 'default'}>
          {getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('metadata', {
      header: 'Details',
      cell: ({ getValue }) => {
        const m = getValue() as Record<string, unknown> | null;
        if (!m) return <span className="text-slate-400">—</span>;
        return (
          <span className="text-slate-500 text-xs truncate max-w-[200px] block">
            {JSON.stringify(m)}
          </span>
        );
      },
    }),
  ] as ColumnDef<AuditLogRow>[];

  const table = useReactTable({
    data: logs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-medium text-slate-900">Audit Log</h2>
      <p className="text-sm text-slate-500">
        Filter by Actor, Target, or Action. Anomalous behavior highlighted.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          placeholder="Actor ID"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="w-40 h-9"
        />
        <Input
          placeholder="Target ID"
          value={targetFilter}
          onChange={(e) => setTargetFilter(e.target.value)}
          className="w-40 h-9"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left py-2 px-3 text-slate-500 font-medium border-b"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-2 px-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <p className="text-slate-500 text-center py-6">No audit logs</p>
      )}
    </div>
  );
}
