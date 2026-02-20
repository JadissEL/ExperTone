'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Check, X } from 'lucide-react';

interface Intervention {
  id: string;
  projectId: string;
  requestId: string;
  expertPayload: Record<string, unknown>;
  score: number;
  status: string;
  createdAt: string;
}

interface InterventionsBentoProps {
  projectId: string | null;
}

export function InterventionsBento({ projectId }: InterventionsBentoProps) {
  const [list, setList] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    const url = projectId
      ? `/api/interventions?projectId=${encodeURIComponent(projectId)}`
      : '/api/interventions';
    setLoading(true);
    fetch(url, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { interventions: [] }))
      .then((d) => setList(d.interventions || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleResolve = async (id: string, action: 'PROCEED' | 'DISCARD') => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/interventions/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setList((prev) => prev.filter((i) => i.id !== id));
      }
    } finally {
      setResolvingId(null);
    }
  };

  const pending = list.filter((i) => i.status === 'PENDING');
  if (pending.length === 0) return null;

  return (
    <motion.div
      layout
      className="rounded-bento-sm border border-expert-amber-muted bg-expert-navy/80 backdrop-blur-[12px] p-3 shadow-glass-soft"
    >
      <div className="flex items-center gap-2 mb-2">
        <UserCheck className="w-4 h-4 text-expert-amber-soft" />
        <span className="text-xs font-medium text-slate-300">Confirm Match</span>
      </div>
      <p className="text-[11px] text-slate-400 mb-2">
        ML score 50–70%: confirm or discard to continue workflow.
      </p>
      <ul className="space-y-2">
        {pending.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between gap-2 rounded-bento-sm bg-expert-frost/30 px-2 py-1.5 border border-expert-frost-border"
          >
            <span className="text-xs text-slate-300 truncate flex-1 min-w-0">
              {(i.expertPayload?.name as string) || i.requestId}
            </span>
            <span className="text-[10px] text-slate-500 shrink-0">{(i.score * 100).toFixed(0)}%</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={!!resolvingId}
                onClick={() => handleResolve(i.id, 'PROCEED')}
                className="p-1 rounded-md bg-expert-sage-muted text-expert-sage hover:opacity-90 disabled:opacity-50"
                title="Confirm match"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!!resolvingId}
                onClick={() => handleResolve(i.id, 'DISCARD')}
                className="p-1 rounded-md bg-red-500/20 text-red-400 hover:opacity-90 disabled:opacity-50"
                title="Discard"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
