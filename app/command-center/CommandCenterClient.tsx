'use client';

import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResearchFilterSidebar } from '@/components/research/ResearchFilterSidebar';
import { ExpertMasterTable } from '@/components/research/ExpertMasterTable';
import { ExpertProfileSheet } from '@/components/research/ExpertProfileSheet';
import { TicketModal } from '@/components/research/TicketModal';
import { useResearchStore } from '@/stores/useResearchStore';
import { Loader2 } from 'lucide-react';

export function CommandCenterClient() {
  const {
    activeProject,
    uiState,
    setActiveTab,
    setResults,
    setProjectStatus,
    setOpenTicketFor,
  } = useResearchStore();
  const openTicketFor = uiState.openTicketFor;

  const [ticketModalOpen, setTicketModalOpen] = React.useState(false);
  const [conflictExpert, setConflictExpert] = React.useState<{
    id: string;
    ownerId: string;
    ownerName?: string;
  } | null>(null);

  // State Sync: Poll status + results when project is scraping. Trigger re-rank when complete.
  const [rerankTriggered, setRerankTriggered] = React.useState(false);
  useEffect(() => {
    if (!activeProject?.id || activeProject.status === 'complete') return;

    const poll = async () => {
      try {
        const [statusRes, resultsRes] = await Promise.all([
          fetch(`/api/projects/${activeProject.id}/status`, { credentials: 'include' }),
          fetch(`/api/projects/${activeProject.id}/results`, { credentials: 'include' }),
        ]);
        if (statusRes.ok && resultsRes.ok) {
          const statusData = await statusRes.json();
          const resultsData = await resultsRes.json();
          const isComplete = statusData.status === 'COMPLETED';
          const hasResults = (resultsData.results?.length ?? 0) > 0;

          if (hasResults) {
            setResults(
              resultsData.results.map((r: { expert: Record<string, unknown>; matchScore: number }) => {
                const e = r.expert;
                return {
                  ...e,
                  similarityScore: r.matchScore,
                  isExisting: true,
                  predictedRate: (e.predictedRate as number) ?? 200,
                  rateConfidence: 0.85,
                  ownerName: (e.owner as { name?: string })?.name,
                  ownerId: e.ownerId,
                };
              })
            );
          }

          if (isComplete) {
            setProjectStatus('complete');
            if (hasResults && !rerankTriggered) {
              setRerankTriggered(true);
              fetch(`/api/projects/${activeProject.id}/rerank`, {
                method: 'POST',
                credentials: 'include',
              }).then(() => poll());
            }
          }
        }
      } catch {
        // ignore
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [activeProject?.id, activeProject?.status, setResults, setProjectStatus, rerankTriggered]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <ResearchFilterSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2">
          {activeProject && (
            <div className="flex items-center gap-2">
              {activeProject.status !== 'idle' && activeProject.status !== 'complete' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              <span className="text-sm font-medium text-slate-700">
                {activeProject.title}
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                {activeProject.status}
              </span>
            </div>
          )}

          <Tabs
            value={uiState.activeTab}
            onValueChange={(v) => setActiveTab(v as 'new_matches' | 'existing_db')}
          >
            <TabsList className="h-8">
              <TabsTrigger value="new_matches" className="text-xs">
                New Matches
              </TabsTrigger>
              <TabsTrigger value="existing_db" className="text-xs">
                Existing DB
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <ExpertMasterTable />
        </div>
      </div>

      <ExpertProfileSheet />

      {openTicketFor && (
        <TicketModal
          open={!!openTicketFor}
          onOpenChange={(o) => !o && setOpenTicketFor(null)}
          expertId={openTicketFor.expertId}
          ownerId={openTicketFor.ownerId}
          ownerName={openTicketFor.ownerName}
        />
      )}
    </div>
  );
}
