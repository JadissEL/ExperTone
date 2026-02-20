'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, DollarSign, ShieldCheck, Play, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, UserCheck, UserPlus } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';

type AgentStatus = 'IDLE' | 'RUNNING' | 'DONE' | 'ERROR';

interface EliteProfile {
  structured?: { seniority?: string; functionalDomain?: string; yearsExperience?: number } | null;
  pricing?: { rateMin?: number; rateMax?: number; confidence?: number; reasoning?: string } | null;
  audit?: { verified?: boolean; confidence?: number; pendingAudit?: boolean; reason?: string } | null;
  aggregatedAt?: string;
}

interface AgentTask {
  id: string;
  candidateLabel: string | null;
  expertId: string | null;
  hunterStatus: AgentStatus;
  hunterMessage: string | null;
  scholarStatus: AgentStatus;
  scholarMessage: string | null;
  valuerStatus: AgentStatus;
  valuerMessage: string | null;
  auditorStatus: AgentStatus;
  auditorMessage: string | null;
  eliteProfile?: EliteProfile | null;
  createdAt: string;
  updatedAt: string;
}

function AgentRow({
  label,
  Icon,
  status,
  message,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  status: AgentStatus;
  message: string | null;
}) {
  const isRunning = status === 'RUNNING';
  const isDone = status === 'DONE';
  const isError = status === 'ERROR';

  return (
    <div className="flex items-start gap-2 py-2 border-b border-expert-frost-border last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        {isRunning && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
        {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {isError && <AlertCircle className="w-4 h-4 text-amber-400" />}
        {status === 'IDLE' && <Icon className="w-4 h-4 text-slate-500" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-200">{label}</p>
        <p className="text-[11px] text-slate-400 truncate">
          {message || (status === 'IDLE' && 'Waiting…') || (status === 'RUNNING' && 'Processing…') || status}
        </p>
      </div>
    </div>
  );
}

interface AgentSquadBentoProps {
  projectId: string | null;
  projectTitle?: string;
  projectStatus?: string;
}

const POLL_INTERVAL_MS = 2500;

export function AgentSquadBento({ projectId, projectTitle, projectStatus }: AgentSquadBentoProps) {
  const refreshExperts = useDashboardStore((s) => s.refreshExperts);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [createExpertLoading, setCreateExpertLoading] = useState(false);
  const [createExpertDone, setCreateExpertDone] = useState<string | null>(null);
  const [createExpertError, setCreateExpertError] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    const fetchTasks = () => {
      fetch(`/api/coordinator/tasks?projectId=${encodeURIComponent(projectId)}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { tasks: [] }))
        .then((d) => setTasks(d.tasks ?? []))
        .catch(() => setTasks([]));
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [projectId]);

  const startPipeline = () => {
    if (!projectId || running) return;
    setRunning(true);
    setError(null);
    const brief = projectTitle?.trim() || 'Expert research brief';
    fetch('/api/coordinator/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectId, brief }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, ...d })))
      .then((d) => {
        if (!d.ok) setError(d.error || 'Failed to start pipeline');
        // Poll will pick up the new task
      })
      .catch(() => setError('Request failed'))
      .finally(() => setRunning(false));
  };

  const latestTask = tasks[0];
  const pendingAuditCount = tasks.filter((t) => t.eliteProfile?.audit?.pendingAudit === true).length;
  const anyRunning =
    latestTask &&
    (latestTask.hunterStatus === 'RUNNING' ||
      latestTask.scholarStatus === 'RUNNING' ||
      latestTask.valuerStatus === 'RUNNING' ||
      latestTask.auditorStatus === 'RUNNING');
  const hasEliteProfile = latestTask?.eliteProfile != null;

  if (!projectId) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-bento-sm border border-expert-frost-border bg-expert-navy/80 backdrop-blur-[12px] p-3 shadow-glass-soft mt-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-300">Agent Squad</span>
        <button
          type="button"
          onClick={startPipeline}
          disabled={running}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-expert-sage-muted text-expert-sage hover:bg-expert-sage/20 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-medium transition-colors"
        >
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {running ? 'Starting…' : 'Run MAS'}
        </button>
      </div>
      {error && <p className="text-[11px] text-amber-400 mb-2">{error}</p>}
      {pendingAuditCount > 0 && (
        <div className="flex items-center gap-1.5 mb-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-300">
            {pendingAuditCount} profile{pendingAuditCount !== 1 ? 's' : ''} pending audit
          </span>
        </div>
      )}
      {anyRunning && (
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-blue-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[11px] text-slate-400">Pipeline in progress</span>
        </div>
      )}
      {latestTask ? (
        <>
          {hasEliteProfile && (
            <div className="mb-2 space-y-1.5">
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-medium text-emerald-300">Elite profile ready</span>
                <button
                  type="button"
                  onClick={() => setShowProfile((s) => !s)}
                  className="ml-auto flex items-center gap-0.5 text-[10px] text-emerald-400 hover:text-emerald-300"
                >
                  {showProfile ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showProfile ? 'Hide' : 'Summary'}
                </button>
              </div>
              {createExpertDone || latestTask.expertId ? (
                <p className={`text-[10px] px-1 ${createExpertError ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {createExpertDone ?? 'Already in pool'}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (!latestTask?.id || createExpertLoading) return;
                    setCreateExpertLoading(true);
                    setCreateExpertDone(null);
                    setCreateExpertError(false);
                    try {
                      const r = await fetch(`/api/coordinator/tasks/${latestTask.id}/create-expert`, {
                        method: 'POST',
                        credentials: 'include',
                      });
                      const d = await r.json();
                      if (r.ok) {
                        setCreateExpertDone(`Added "${d.name ?? 'Expert'}" to pool.`);
                        refreshExperts();
                      } else {
                        setCreateExpertError(true);
                        setCreateExpertDone(d.error ?? 'Failed to add expert.');
                      }
                    } catch {
                      setCreateExpertError(true);
                      setCreateExpertDone('Request failed.');
                    } finally {
                      setCreateExpertLoading(false);
                    }
                  }}
                  disabled={createExpertLoading}
                  className="flex items-center gap-1.5 w-full rounded-md bg-slate-600/60 hover:bg-slate-600/80 border border-slate-500/50 px-2 py-1.5 text-[11px] text-slate-200 disabled:opacity-50"
                >
                  {createExpertLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                  {createExpertLoading ? 'Adding…' : 'Add to pool'}
                </button>
              )}
            </div>
          )}
          <AnimatePresence>
            {showProfile && latestTask.eliteProfile && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-2 overflow-hidden rounded-md bg-slate-800/60 border border-slate-600/50 p-2 text-[10px] text-slate-300 space-y-1"
              >
                {latestTask.eliteProfile.structured && (
                  <p>
                    <span className="text-slate-500">Role:</span>{' '}
                    {[latestTask.eliteProfile.structured.seniority, latestTask.eliteProfile.structured.functionalDomain]
                      .filter(Boolean)
                      .join(' · ')}
                    {latestTask.eliteProfile.structured.yearsExperience != null &&
                      ` · ${latestTask.eliteProfile.structured.yearsExperience} yrs`}
                  </p>
                )}
                {latestTask.eliteProfile.pricing &&
                  (latestTask.eliteProfile.pricing.rateMin != null || latestTask.eliteProfile.pricing.rateMax != null) && (
                    <p>
                      <span className="text-slate-500">Rate:</span> $
                      {[latestTask.eliteProfile.pricing.rateMin, latestTask.eliteProfile.pricing.rateMax]
                        .filter((n) => n != null)
                        .join('–')}
                      /hr
                    </p>
                  )}
                {latestTask.eliteProfile.audit && (
                  <p>
                    <span className="text-slate-500">Audit:</span>{' '}
                    {latestTask.eliteProfile.audit.pendingAudit ? (
                      <span className="text-amber-400">Pending review</span>
                    ) : (
                      <span className="text-emerald-400">Verified</span>
                    )}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-0">
            <AgentRow label="The Hunter" Icon={Search} status={latestTask.hunterStatus} message={latestTask.hunterMessage} />
            <AgentRow label="The Scholar" Icon={BookOpen} status={latestTask.scholarStatus} message={latestTask.scholarMessage} />
            <AgentRow label="The Valuer" Icon={DollarSign} status={latestTask.valuerStatus} message={latestTask.valuerMessage} />
            <AgentRow label="The Auditor" Icon={ShieldCheck} status={latestTask.auditorStatus} message={latestTask.auditorMessage} />
          </div>
        </>
      ) : (
        <p className="text-[11px] text-slate-500 py-2">
          Click &quot;Run MAS&quot; to run the Coordinator pipeline (Hunter → Scholar → Valuer → Auditor).
        </p>
      )}
    </motion.div>
  );
}
