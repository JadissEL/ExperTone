'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Filter, LayoutGrid, Network, Table2 } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { AgentLiveFeed } from '@/components/dashboard/AgentLiveFeed';
import { ExpertGraph3D } from '@/components/dashboard/ExpertGraph3D';
import { ExpertDataTable } from '@/components/dashboard/ExpertDataTable';
import { ExpertSidePanel } from '@/components/dashboard/ExpertSidePanel';
import { GraphErrorBoundary } from '@/components/dashboard/GraphErrorBoundary';
import { TableErrorBoundary } from '@/components/dashboard/TableErrorBoundary';
import { LiveProgressBento } from '@/components/dashboard/LiveProgressBento';
import { InterventionsBento } from '@/components/dashboard/InterventionsBento';
import { AgentSquadBento } from '@/components/dashboard/AgentSquadBento';

interface ProjectItem {
  id: string;
  title: string;
  status: string;
  _count: { results: number };
}

type ViewMode = 'split' | 'table' | 'graph';

export function DashboardClient() {
  const { activeProjectId, setActiveProject, selectedExpert } = useDashboardStore();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  useEffect(() => {
    fetch('/api/projects', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-5rem)] mesh-bg">
      {/* Left: 25% - Projects & Filters */}
      <aside className="col-span-3 flex flex-col gap-4 overflow-hidden">
        <div className="glass-dark rounded-bento p-4 flex flex-col min-h-0 shadow-glass-soft">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-5 h-5 text-expert-sage" />
            <span className="font-medium text-slate-200">Research Projects</span>
          </div>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-slate-500 text-sm">No projects yet.</p>
          ) : (
            <ul className="flex-1 overflow-y-auto space-y-1">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() =>
                      setActiveProject(activeProjectId === p.id ? null : p.id)
                    }
                    className={`w-full text-left px-3 py-2 rounded-bento-sm text-sm transition-colors ${
                      activeProjectId === p.id
                        ? 'bg-expert-sage-muted text-expert-sage border border-expert-sage/40'
                        : 'hover:bg-expert-frost/50 text-slate-300'
                    }`}
                  >
                    <span className="font-medium truncate block">{p.title}</span>
                    <span className="text-xs text-slate-500">
                      {p.status} · {p._count?.results ?? 0} experts
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {activeProjectId && (
            <>
              <LiveProgressBento
                projectId={activeProjectId}
                projectStatus={projects.find((p) => p.id === activeProjectId)?.status}
              />
              <AgentSquadBento
                projectId={activeProjectId}
                projectTitle={projects.find((p) => p.id === activeProjectId)?.title}
                projectStatus={projects.find((p) => p.id === activeProjectId)?.status}
              />
              <InterventionsBento projectId={activeProjectId} />
            </>
          )}
        </div>

        <div className="glass-dark rounded-bento p-4 shadow-glass-soft">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-300 text-sm">Filters</span>
          </div>
          <p className="text-xs text-slate-500">
            Select a project above to filter experts by hunt results.
          </p>
        </div>
      </aside>

      {/* Center: 50% - 3D Graph + Expert Table with view toggle */}
      <section className="col-span-6 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0">
          {(['split', 'graph', 'table'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-expert-sage-muted text-expert-sage border border-expert-sage/40'
                  : 'bg-expert-frost/50 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {mode === 'split' && <LayoutGrid className="w-3.5 h-3.5" />}
              {mode === 'graph' && <Network className="w-3.5 h-3.5" />}
              {mode === 'table' && <Table2 className="w-3.5 h-3.5" />}
              {mode === 'split' ? 'Split' : mode === 'graph' ? 'Graph' : 'Table'}
            </button>
          ))}
        </div>
        <motion.div
          layout
          layoutId="dashboard-main-content"
          transition={{ type: 'spring', bounce: 0.2, stiffness: 300, damping: 30 }}
          className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden"
        >
          {(viewMode === 'split' || viewMode === 'graph') && (
            <motion.div
              layout
              initial={false}
              className={viewMode === 'graph' ? 'flex-1 min-h-0' : 'flex-1 min-h-0'}
            >
              <div className="h-full min-h-[200px] rounded-bento overflow-hidden glass-dark shadow-glass-soft">
                <Suspense fallback={<div className="h-full flex items-center justify-center bg-expert-navy/50 rounded-bento text-slate-500">Loading graph...</div>}>
                  <GraphErrorBoundary>
                    <ExpertGraph3D />
                  </GraphErrorBoundary>
                </Suspense>
              </div>
            </motion.div>
          )}
          {(viewMode === 'split' || viewMode === 'table') && (
            <motion.div layout initial={false} className={viewMode === 'table' ? 'flex-1 min-h-0' : 'h-48 min-h-[180px] shrink-0'}>
              <TableErrorBoundary>
                <ExpertDataTable />
              </TableErrorBoundary>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Right: 25% - Agent Feed + Expert Panel (panel overlays when expert selected) */}
      <aside className="col-span-3 flex flex-col gap-4 overflow-hidden relative min-w-0">
        <div className="flex-1 min-h-0 rounded-bento overflow-hidden glass-dark shadow-glass-soft">
          <AgentLiveFeed />
        </div>
        {selectedExpert && <ExpertSidePanel />}
      </aside>
    </div>
  );
}
