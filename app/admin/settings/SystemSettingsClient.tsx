'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Activity, CheckCircle, XCircle } from 'lucide-react';

type UserRow = { id: string; email: string };

export function SystemSettingsClient({
  mlSensitivity,
  expiryDays,
  users,
}: {
  mlSensitivity: number;
  expiryDays: number;
  users: UserRow[];
}) {
  const [sensitivity, setSensitivity] = useState(mlSensitivity);
  const [savingSensitivity, setSavingSensitivity] = useState(false);
  const [bulkIds, setBulkIds] = useState('');
  const [bulkOwner, setBulkOwner] = useState('');
  const [reclaiming, setReclaiming] = useState(false);
  const [health, setHealth] = useState<{
    ml: 'ok' | 'error' | null;
    n8n: 'ok' | 'error' | null;
  }>({ ml: null, n8n: null });

  useEffect(() => {
    fetch('/api/admin/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setHealth({ ml: d.mlHealth, n8n: d.n8nHealth }))
      .catch(() => setHealth({ ml: 'error', n8n: 'error' }));
  }, []);

  const onSaveSensitivity = async () => {
    setSavingSensitivity(true);
    try {
      const res = await fetch('/api/admin/settings/ml-sensitivity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: sensitivity }),
      });
      if (!res.ok) throw new Error('Failed');
      window.location.reload();
    } finally {
      setSavingSensitivity(false);
    }
  };

  const onBulkReclaim = async () => {
    const ids = bulkIds
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0 || !bulkOwner) return;
    setReclaiming(true);
    try {
      const res = await fetch('/api/admin/settings/bulk-reclaim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertIds: ids, newOwnerId: bulkOwner }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      alert(`Reclaimed ${data.reclaimed} experts`);
      setBulkIds('');
      setBulkOwner('');
    } finally {
      setReclaiming(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">ML Sensitivity</h2>
        <p className="text-sm text-slate-500">
          Threshold for High Confidence match (0–1)
        </p>
        <div className="mt-3 flex items-center gap-4">
          <Slider
            value={[sensitivity]}
            onValueChange={([v]) => v !== undefined && setSensitivity(v)}
            min={0}
            max={1}
            step={0.05}
            className="w-48"
          />
          <span className="text-sm font-medium">{sensitivity.toFixed(2)}</span>
          <Button onClick={onSaveSensitivity} disabled={savingSensitivity}>
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          n8n & ML Health
        </h2>
        <p className="text-sm text-slate-500">
          Webhook and ML microservice heartbeats
        </p>
        <div className="mt-3 flex gap-4">
          <div className="flex items-center gap-2">
            {health.ml === 'ok' ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : health.ml === 'error' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Activity className="h-5 w-5 animate-pulse text-slate-400" />
            )}
            <span className="text-sm">ML Service (FastAPI)</span>
          </div>
          <div className="flex items-center gap-2">
            {health.n8n === 'ok' ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : health.n8n === 'error' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Activity className="h-5 w-5 animate-pulse text-slate-400" />
            )}
            <span className="text-sm">n8n Webhooks</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Bulk Reclaim</h2>
        <p className="text-sm text-slate-500">
          Pull experts back from Global Pool when a team leaves
        </p>
        <div className="mt-3 space-y-2">
          <textarea
            placeholder="Expert IDs (one per line or comma-separated)"
            value={bulkIds}
            onChange={(e) => setBulkIds(e.target.value)}
            className="w-full h-24 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <Select value={bulkOwner} onValueChange={setBulkOwner}>
            <SelectTrigger className="w-[280px]">
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
          <Button onClick={onBulkReclaim} disabled={reclaiming || !bulkIds.trim() || !bulkOwner}>
            Bulk Reclaim
          </Button>
        </div>
      </div>
    </div>
  );
}
