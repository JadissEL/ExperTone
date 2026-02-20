'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

interface HeartbeatData {
  status: string;
  progress: number;
  current_action: string | null;
  last_heartbeat_at: string | null;
}

interface LiveProgressBentoProps {
  projectId: string | null;
  projectStatus?: string;
  pollWhenIdle?: boolean;
}

const POLL_INTERVAL_MS = 3000;

export function LiveProgressBento({ projectId, projectStatus, pollWhenIdle }: LiveProgressBentoProps) {
  const [data, setData] = useState<HeartbeatData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isActive = projectStatus === 'RUNNING' || projectStatus === 'PENDING' || pollWhenIdle;

  useEffect(() => {
    if (!projectId || !isActive) {
      setData(null);
      setError(null);
      return;
    }

    const fetchHeartbeat = () => {
      fetch(`/api/projects/${projectId}/heartbeat`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setData(d);
          setError(null);
        })
        .catch(() => setError('Unable to load progress'));
    };

    fetchHeartbeat();
    const interval = setInterval(fetchHeartbeat, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [projectId, isActive]);

  if (!projectId) return null;

  const show = isActive && (data || error);
  if (!show) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-bento-sm border border-expert-frost-border bg-expert-navy/80 backdrop-blur-[12px] p-3 shadow-glass-soft"
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-expert-sage" />
        <span className="text-xs font-medium text-slate-300">Live Progress</span>
      </div>
      {error ? (
        <p className="text-xs text-amber-400">{error}</p>
      ) : data ? (
        <>
          <div className="h-1.5 w-full rounded-full bg-expert-navy-muted overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-expert-sage"
              initial={{ width: 0 }}
              animate={{ width: `${data.progress}%` }}
              transition={{ type: 'spring', bounce: 0.2, stiffness: 300 }}
              style={{ maxWidth: '100%' }}
            />
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {data.current_action || data.status || 'Processing…'}
          </p>
          {data.last_heartbeat_at && (
            <p className="text-[10px] text-slate-600 mt-0.5">
              Updated {new Date(data.last_heartbeat_at).toLocaleTimeString()}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-500">Waiting for heartbeat…</p>
      )}
    </motion.div>
  );
}
