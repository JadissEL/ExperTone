'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useResearchStore } from '@/stores/useResearchStore';
import type { ResearchExpert } from '@/types/expert';
import { cn } from '@/lib/utils';
import { formatWorkHistoryEntry } from '@/lib/expert-display';

export function ExpertProfileSheet() {
  const { uiState, setSelectedExpertId, results } = useResearchStore();
  const selectedId = uiState.selectedExpertId;
  const expertFromStore = results.find((r) => r.id === selectedId);
  const [expertFromApi, setExpertFromApi] = useState<ResearchExpert | null>(null);
  const [loading, setLoading] = useState(false);

  const expert = expertFromStore ?? expertFromApi;

  useEffect(() => {
    if (!selectedId) {
      setExpertFromApi(null);
      return;
    }
    if (expertFromStore) {
      setExpertFromApi(null);
      return;
    }
    setLoading(true);
    fetch(`/api/experts/${selectedId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setExpertFromApi(
          d
            ? {
                ...d,
                isExisting: true,
                similarityScore: 0.8,
                predictedRate: d.predictedRate ?? 200,
              }
            : null
        )
      )
      .catch(() => setExpertFromApi(null))
      .finally(() => setLoading(false));
  }, [selectedId, expertFromStore]);

  const open = !!selectedId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && setSelectedExpertId(null)}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Expert Profile</SheetTitle>
          <SheetDescription>
            ML insights, work history, and relationship graph
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : expert ? (
          <div className="mt-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
                {expert.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{expert.name}</h3>
                <p className="text-sm text-slate-500">
                  {expert.industry} · {expert.subIndustry}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="emerald">
                    {(expert.similarityScore ?? 0) * 100}% match
                  </Badge>
                  <Badge variant="secondary">
                    ${expert.predictedRate}/hr
                  </Badge>
                </div>
              </div>
            </div>

            {/* Reputation & Algorithm Signals */}
            {((expert as ResearchExpert & { reputationScore?: number | null }).reputationScore != null ||
              (expert as ResearchExpert & { subjectFrequencyMap?: Record<string, number> }).subjectFrequencyMap ||
              (expert as ResearchExpert & { reliabilityIndex?: number | null }).reliabilityIndex != null) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="text-sm font-medium text-slate-900">Score Breakdown</h4>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {(expert as ResearchExpert & { reputationScore?: number | null }).reputationScore != null && (
                    <p>Reputation: {((expert as ResearchExpert & { reputationScore?: number }).reputationScore ?? 0).toFixed(2)}</p>
                  )}
                  {(expert as ResearchExpert & { reliabilityIndex?: number | null }).reliabilityIndex != null && (
                    <p>Reliability: {((expert as ResearchExpert & { reliabilityIndex?: number }).reliabilityIndex ?? 0).toFixed(2)}</p>
                  )}
                  {(expert as ResearchExpert & { subjectFrequencyMap?: Record<string, number> }).subjectFrequencyMap &&
                    Object.keys((expert as ResearchExpert & { subjectFrequencyMap?: Record<string, number> }).subjectFrequencyMap ?? {}).length > 0 && (
                      <div>
                        <p className="text-slate-500 mb-1">Subject mastery:</p>
                        <ul className="list-disc list-inside text-xs">
                          {Object.entries((expert as ResearchExpert & { subjectFrequencyMap: Record<string, number> }).subjectFrequencyMap)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([k, v]) => (
                              <li key={k}>{k}: {v}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Past Work History */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="text-sm font-medium text-slate-900">Past Work History</h4>
              <div className="mt-3 space-y-2">
                {Array.isArray(expert.pastEmployers) && expert.pastEmployers.length > 0 ? (
                  expert.pastEmployers.slice(0, 8).map((e: unknown, i: number) => (
                    <div key={i} className="text-sm text-slate-700">
                      • {formatWorkHistoryEntry(e)}
                    </div>
                  ))
                ) : (
                  <div className="h-16 rounded border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                    No work history
                  </div>
                )}
              </div>
            </div>

            {/* Source References */}
            {(expert as ResearchExpert & { sources?: Array<{ sourceType: string; sourceUrl: string | null }> }).sources &&
              (expert as ResearchExpert & { sources: Array<{ sourceType: string; sourceUrl: string | null }> }).sources.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-sm font-medium text-slate-900">Source References</h4>
                  <div className="mt-3 space-y-1 text-xs">
                    {(expert as ResearchExpert & { sources: Array<{ sourceType: string; sourceUrl: string | null }> }).sources.map((s, i) => (
                      <div key={i}>
                        {s.sourceType}: {s.sourceUrl ? (
                          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline truncate block">
                            {s.sourceUrl}
                          </a>
                        ) : '—'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 30-day countdown (if PRIVATE) */}
            {expert.visibilityStatus === 'PRIVATE' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <h4 className="text-sm font-medium text-amber-900">
                  Global Pool Countdown
                </h4>
                <p className="mt-1 text-xs text-amber-700">
                  Upload 1 verified contact within 30 days to keep expert private.
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-200">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${Math.max(0, (expert.daysUntilGlobal ?? 15) / 30) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-amber-600">
                  {expert.daysUntilGlobal ?? 15} days remaining
                </p>
                <Button size="sm" variant="outline" className="mt-3">
                  Verify & Upload Contact
                </Button>
              </div>
            )}

            {/* Relationship Graph placeholder */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="text-sm font-medium text-slate-900">
                Relationship Graph
              </h4>
              <p className="mt-2 text-xs text-slate-500">
                NetworkX-powered influence hub (future).
              </p>
              <div className="mt-3 h-32 rounded border border-dashed border-slate-300 bg-white/50 flex items-center justify-center text-xs text-slate-400">
                Graph placeholder
              </div>
            </div>
          </div>
        ) : selectedId && !loading ? (
          <div className="py-12 text-center text-slate-500">
            Expert not found
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
