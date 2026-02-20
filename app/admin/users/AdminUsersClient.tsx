'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderKanban } from 'lucide-react';

type UserRow = {
  id: string;
  email: string;
  role: string;
  teamId: string | null;
  createdAt: Date;
  totalOwned: number;
  convertedToGlobal: number;
  contributionScore: number;
  projectCount: number;
};

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  creator: { id: string; email: string };
};

const columnHelper = createColumnHelper<UserRow>();

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'emerald' | 'purple'> = {
  SUPER_ADMIN: 'purple',
  ADMIN: 'emerald',
  TEAM_LEAD: 'secondary',
  CSA: 'default',
};

export function AdminUsersClient({
  users,
  activeProjects,
}: {
  users: UserRow[];
  activeProjects: ProjectRow[];
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const onRoleChange = async (userId: string, role: string) => {
    setUpdating((s) => new Set(s).add(userId));
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed');
      window.location.reload();
    } finally {
      setUpdating((s) => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  };

  const columns = [
    columnHelper.accessor('email', {
      header: 'Email',
      cell: ({ getValue }) => (
        <span className="font-medium text-slate-900">{getValue()}</span>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: ({ row }) => (
        <Select
          value={row.original.role}
          onValueChange={(v) => onRoleChange(row.original.id, v)}
          disabled={updating.has(row.original.id)}
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CSA">CSA</SelectItem>
            <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      ),
    }),
    columnHelper.accessor('totalOwned', {
      header: 'Experts Owned',
      cell: ({ getValue }) => (
        <span className="text-slate-700">{getValue()}</span>
      ),
    }),
    columnHelper.accessor('convertedToGlobal', {
      header: '→ Global Pool',
      cell: ({ getValue }) => (
        <span className="text-slate-600">{getValue()}</span>
      ),
    }),
    columnHelper.accessor('contributionScore', {
      header: 'Contribution %',
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <Badge variant={v >= 50 ? 'emerald' : v >= 20 ? 'secondary' : 'default'}>
            {v.toFixed(0)}%
          </Badge>
        );
      },
    }),
    columnHelper.accessor('projectCount', {
      header: 'Projects',
      cell: ({ getValue }) => (
        <span className="text-slate-600">{getValue()}</span>
      ),
    }),
  ] as ColumnDef<UserRow>[];

  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Permission Matrix</h2>
        <p className="text-sm text-slate-500">
          Manage roles: SuperAdmin, TeamLead, CSA
        </p>
        <div className="mt-3">
          <input
            type="text"
            placeholder="Search users..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-300 px-3 text-sm w-64"
          />
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
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900 flex items-center gap-2">
          <FolderKanban className="h-4 w-4" />
          Active Session Monitoring
        </h2>
        <p className="text-sm text-slate-500">
          Research projects running across the organization
        </p>
        <div className="mt-3 space-y-2">
          {activeProjects.length === 0 ? (
            <p className="text-slate-500 text-sm">No active projects</p>
          ) : (
            activeProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
              >
                <span className="font-medium text-slate-800">{p.title}</span>
                <span className="text-sm text-slate-500">{p.creator.email}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
