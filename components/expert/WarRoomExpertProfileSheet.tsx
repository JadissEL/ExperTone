'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ExternalLink } from 'lucide-react';

interface ExpertProfile {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  country: string;
  region?: string;
  seniorityScore?: number;
  yearsExperience?: number;
  predictedRate?: number;
  linkedinUrl?: string | null;
  pastEmployers?: unknown;
  skills?: unknown;
  totalEngagements?: number;
  averageActualRate?: number | null;
  sourceVerified?: boolean | null;
  engagements?: Array<{ subjectMatter: string; date: string; clientFeedbackScore: number }>;
}

interface WarRoomExpertProfileSheetProps {
  expertId: string | null;
  onClose: () => void;
}

export function WarRoomExpertProfileSheet({ expertId, onClose }: WarRoomExpertProfileSheetProps) {
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expertId) {
      setExpert(null);
      return;
    }
    setLoading(true);
    fetch(`/api/experts/${expertId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setExpert)
      .catch(() => setExpert(null))
      .finally(() => setLoading(false));
  }, [expertId]);

  const open = !!expertId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto bg-slate-900 border-slate-700 text-slate-100"
      >
        <SheetHeader>
          <SheetTitle className="text-slate-100">Expert Profile</SheetTitle>
          <SheetDescription className="text-slate-400">
            Structured view with sources and professional background
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : expert ? (
          <div className="mt-6 space-y-6">
            {/* Core Identity */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-700 text-lg font-semibold text-slate-300">
                {expert.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-100">{expert.name}</h3>
                <p className="text-sm text-slate-400">
                  {expert.industry} · {expert.subIndustry}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {expert.country} {expert.region ? `· ${expert.region}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {expert.sourceVerified === false && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-300 border border-amber-700/50"
                      title="Created from input only; no scraped sources verified"
                    >
                      Unverified
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/50 text-emerald-300">
                    ${expert.predictedRate?.toFixed(0) ?? '-'}/hr
                  </span>
                  {expert.seniorityScore != null && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                      Seniority: {expert.seniorityScore}
                    </span>
                  )}
                  {expert.yearsExperience != null && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                      {expert.yearsExperience} yrs exp
                    </span>
                  )}
                </div>
                {expert.linkedinUrl && (
                  <a
                    href={expert.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-sky-400 hover:text-sky-300"
                  >
                    View on LinkedIn <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Past Work History */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h4 className="text-sm font-medium text-slate-200">Work History</h4>
              <div className="mt-3 space-y-2">
                {Array.isArray(expert.pastEmployers) && expert.pastEmployers.length > 0 ? (
                  expert.pastEmployers.slice(0, 8).map((e: unknown, i: number) => (
                    <div key={i} className="text-sm text-slate-400">
                      • {String(e)}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No work history available</p>
                )}
              </div>
            </div>

            {/* Engagements */}
            {expert.engagements && expert.engagements.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="text-sm font-medium text-slate-200">Recent Engagements</h4>
                <div className="mt-3 space-y-2">
                  {expert.engagements.slice(0, 5).map((e, i) => (
                    <div key={i} className="text-sm text-slate-400">
                      <span className="text-slate-500">
                        {new Date(e.date).toLocaleDateString()}
                      </span>{' '}
                      · {e.subjectMatter} · {e.clientFeedbackScore}/5
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal ID */}
            <p className="text-xs text-slate-600">ID: {expert.id}</p>
          </div>
        ) : expertId && !loading ? (
          <div className="py-12 text-center text-slate-500">Expert not found</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
