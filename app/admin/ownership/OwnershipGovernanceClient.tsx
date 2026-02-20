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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TicketRow = {
  id: string;
  expert: { id: string; name: string; industry: string; ownerId: string; owner: { id: string; email: string } };
  requester: { id: string; email: string };
  owner: { id: string; email: string };
};

type UserRow = { id: string; email: string };

type VerifiedExpert = {
  id: string;
  name: string;
  industry: string;
  owner: { id: string; email: string };
  contacts: { id: string; type: string; value: string; verifiedAt: string | null; verifiedBy: string | null }[];
};

export function OwnershipGovernanceClient({
  tickets,
  users,
  verifiedExperts,
}: {
  tickets: TicketRow[];
  users: UserRow[];
  verifiedExperts: VerifiedExpert[];
}) {
  const [reassigning, setReassigning] = useState<Set<string>>(new Set());
  const [expiring, setExpiring] = useState<Set<string>>(new Set());
  const [selectedOwner, setSelectedOwner] = useState<Record<string, string>>({});

  const onReassign = async (expertId: string, newOwnerId: string) => {
    setReassigning((s) => new Set(s).add(expertId));
    try {
      const res = await fetch(`/api/admin/experts/${expertId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      });
      if (!res.ok) throw new Error('Failed');
      window.location.reload();
    } finally {
      setReassigning((s) => {
        const next = new Set(s);
        next.delete(expertId);
        return next;
      });
    }
  };

  const onForceExpire = async (expertId: string) => {
    setExpiring((s) => new Set(s).add(expertId));
    try {
      const res = await fetch(`/api/admin/experts/${expertId}/force-expire`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed');
      window.location.reload();
    } finally {
      setExpiring((s) => {
        const next = new Set(s);
        next.delete(expertId);
        return next;
      });
    }
  };

  return (
    <div className="mt-6">
      <Tabs defaultValue="disputes">
        <TabsList>
          <TabsTrigger value="disputes">Ownership Disputes</TabsTrigger>
          <TabsTrigger value="verified">Verification Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-900">Ownership Dispute Resolver</h2>
            <p className="text-sm text-slate-500">
              Reassign experts from one CSA to another manually
            </p>
            {tickets.length === 0 ? (
              <p className="mt-4 text-slate-500">No open tickets</p>
            ) : (
              <div className="mt-4 space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded border border-slate-200 p-3"
                  >
                    <div>
                      <span className="font-medium text-slate-800">{t.expert.name}</span>
                      <span className="ml-2 text-slate-500">({t.expert.industry})</span>
                      <p className="text-sm text-slate-500">
                        Current: {t.expert.owner.email} | Requester: {t.requester.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedOwner[t.expert.id] ?? ''}
                        onValueChange={(v) =>
                          setSelectedOwner((s) => ({ ...s, [t.expert.id]: v }))
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select new owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => {
                          const ownerId = selectedOwner[t.expert.id];
                          if (ownerId) onReassign(t.expert.id, ownerId);
                        }}
                        disabled={
                          !selectedOwner[t.expert.id] || reassigning.has(t.expert.id)
                        }
                      >
                        Reassign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onForceExpire(t.expert.id)}
                        disabled={expiring.has(t.expert.id)}
                      >
                        Force to Global Pool
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="verified" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-900">Verification Audit Queue</h2>
            <p className="text-sm text-slate-500">
              Experts flagged as verified by CSAs — audit 1 Personal Contact quality
            </p>
            {verifiedExperts.length === 0 ? (
              <p className="mt-4 text-slate-500">No verified experts</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium border-b">
                        Expert
                      </th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium border-b">
                        Owner
                      </th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium border-b">
                        Contact Type
                      </th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium border-b">
                        Value
                      </th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium border-b">
                        Verified By
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedExperts.flatMap((e) =>
                      e.contacts.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100">
                          <td className="py-2 px-3">
                            <span className="font-medium text-slate-800">{e.name}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{e.owner.email}</td>
                          <td className="py-2 px-3">
                            <Badge variant="secondary">{c.type}</Badge>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{c.value}</td>
                          <td className="py-2 px-3 text-slate-500">{c.verifiedBy ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
