'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Heatmap = { within24h: number; within7d: number; within15d: number };

type LogEntry = {
  id: string;
  targetId: string | null;
  actorId: string | null;
  createdAt: string;
  metadata: unknown;
};

export function DataDecayMonitorClient({
  heatmap,
  autoTransferLogs,
  expiryDays,
}: {
  heatmap: Heatmap;
  autoTransferLogs: LogEntry[];
  expiryDays: number;
}) {
  const [expiryValue, setExpiryValue] = useState(String(expiryDays));
  const [saving, setSaving] = useState(false);

  const onSaveExpiry = async () => {
    const n = parseInt(expiryValue, 10);
    if (isNaN(n) || n < 1 || n > 90) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/decay/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryDays: n }),
      });
      if (!res.ok) throw new Error('Failed');
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  const maxHeat = Math.max(heatmap.within24h, heatmap.within7d, heatmap.within15d, 1);
  const pct = (v: number) => (v / maxHeat) * 100;

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Expiry Pipeline Heatmap</h2>
        <p className="text-sm text-slate-500">
          Experts approaching Global Pool transition
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-medium text-amber-800">Within 24h</div>
            <div className="mt-1 text-2xl font-semibold text-amber-900">
              {heatmap.within24h}
            </div>
            <div
              className="mt-2 h-2 rounded bg-amber-200"
              style={{ width: `${pct(heatmap.within24h)}%` }}
            />
          </div>
          <div className="rounded border border-orange-200 bg-orange-50 p-4">
            <div className="text-sm font-medium text-orange-800">Within 7 days</div>
            <div className="mt-1 text-2xl font-semibold text-orange-900">
              {heatmap.within7d}
            </div>
            <div
              className="mt-2 h-2 rounded bg-orange-200"
              style={{ width: `${pct(heatmap.within7d)}%` }}
            />
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-700">Within 15 days</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {heatmap.within15d}
            </div>
            <div
              className="mt-2 h-2 rounded bg-slate-200"
              style={{ width: `${pct(heatmap.within15d)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Automation Control</h2>
        <p className="text-sm text-slate-500">
          Adjust the expiry constant (days until Global Pool transition)
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={90}
            value={expiryValue}
            onChange={(e) => setExpiryValue(e.target.value)}
            className="w-24"
          />
          <span className="text-sm text-slate-500">days</span>
          <Button onClick={onSaveExpiry} disabled={saving}>
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Auto-Transfer Logs</h2>
        <p className="text-sm text-slate-500">
          Experts moved to Global Pool by automated background job
        </p>
        <div className="mt-3 max-h-64 overflow-y-auto">
          {autoTransferLogs.length === 0 ? (
            <p className="text-slate-500 text-sm">No transfers yet</p>
          ) : (
            <ul className="space-y-2">
              {autoTransferLogs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded border border-slate-100 px-3 py-2 text-sm"
                >
                  <span>Expert {l.targetId}</span>
                  <span className="text-slate-500">{l.createdAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
