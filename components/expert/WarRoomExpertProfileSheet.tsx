'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ExternalLink, Shield, TrendingUp, BarChart3, FileText, Link2 } from 'lucide-react';
import { formatWorkHistoryEntry } from '@/lib/expert-display';

/** Full expert profile shape matching API response — no placeholders, only real DB-backed data */
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
  predictedRateRange?: { min?: number; max?: number; predicted_rate?: number } | null;
  linkedinUrl?: string | null;
  pastEmployers?: unknown;
  skills?: unknown;
  totalEngagements?: number;
  averageActualRate?: number | null;
  sourceVerified?: boolean | null;
  reputationScore?: number | null;
  subjectFrequencyMap?: Record<string, number> | null;
  reliabilityIndex?: number | null;
  expertFootprint?: { trailA?: boolean; trailB?: boolean; trailC?: boolean; trailD?: boolean } | null;
  yearsBySource?: Record<string, number> | null;
  seniorityFlag?: string | null;
  verifiedBadgeProvider?: string | null;
  verifiedAt?: string | null;
  citationCount?: number;
  patentCount?: number;
  professionalAuthorityIndex?: number | null;
  complianceScore?: number | null;
  mnpiRiskLevel?: string | null;
  sources?: Array<{ id: string; sourceType: string; sourceUrl: string | null; retrievedAt: string }>;
  engagements?: Array<{
    id: string;
    subjectMatter: string;
    date: string;
    clientFeedbackScore: number;
    actualCost?: number | null;
    durationMinutes?: number;
  }>;
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
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-100">{expert.name}</h3>
                <p className="text-sm text-slate-400">
                  {expert.industry} · {expert.subIndustry}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {expert.country} {expert.region ? `· ${expert.region}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {expert.sourceVerified === true && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
                      title="Verified from scraped sources"
                    >
                      <Shield className="w-3 h-3" /> Verified
                    </span>
                  )}
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
                  {expert.seniorityFlag && expert.seniorityFlag !== 'OK' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-900/50 text-amber-300">
                      {expert.seniorityFlag}
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

            {/* Rate & Confidence */}
            {(expert.predictedRateRange || expert.averageActualRate != null) && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Rate & Confidence
                </h4>
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  {expert.predictedRateRange && (
                    <p>
                      Predicted range: $
                      {typeof expert.predictedRateRange.min === 'number' &&
                      typeof expert.predictedRateRange.max === 'number'
                        ? `${expert.predictedRateRange.min}–${expert.predictedRateRange.max}`
                        : '—'}
                      /hr
                    </p>
                  )}
                  {expert.averageActualRate != null && (
                    <p>Average actual rate: ${expert.averageActualRate.toFixed(0)}/hr</p>
                  )}
                </div>
              </div>
            )}

            {/* Reputation & Algorithm Signals */}
            {(expert.reputationScore != null ||
              expert.reliabilityIndex != null ||
              (expert.subjectFrequencyMap && Object.keys(expert.subjectFrequencyMap).length > 0)) && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Reputation & Algorithm Signals
                </h4>
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  {expert.reputationScore != null && (
                    <p>Reputation score: {expert.reputationScore.toFixed(2)}</p>
                  )}
                  {expert.reliabilityIndex != null && (
                    <p>Reliability index: {expert.reliabilityIndex.toFixed(2)}</p>
                  )}
                  {expert.subjectFrequencyMap && Object.keys(expert.subjectFrequencyMap).length > 0 && (
                    <div>
                      <p className="text-slate-500 mb-1">Subject frequency (proven expertise):</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {Object.entries(expert.subjectFrequencyMap)
                          .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
                          .slice(0, 8)
                          .map(([k, v]) => (
                            <li key={k}>
                              {k}: {String(v)}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scent Signals (Expert Footprint) */}
            {expert.expertFootprint &&
              typeof expert.expertFootprint === 'object' &&
              Object.keys(expert.expertFootprint).length > 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <h4 className="text-sm font-medium text-slate-200">Scent Signals</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['trailA', 'trailB', 'trailC', 'trailD'] as const).map((k) => {
                      const v = (expert.expertFootprint as Record<string, boolean>)?.[k];
                      if (v == null) return null;
                      const labels: Record<string, string> = {
                        trailA: 'Social',
                        trailB: 'IP',
                        trailC: 'Market',
                        trailD: 'Internal',
                      };
                      return (
                        <span
                          key={k}
                          className={`inline-flex px-2 py-0.5 rounded text-xs ${
                            v ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-700 text-slate-500'
                          }`}
                        >
                          {labels[k] ?? k}: {v ? 'Yes' : 'No'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Work History */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Work History
              </h4>
              <div className="mt-3 space-y-2">
                {Array.isArray(expert.pastEmployers) && expert.pastEmployers.length > 0 ? (
                  expert.pastEmployers.slice(0, 12).map((e: unknown, i: number) => (
                    <div key={i} className="text-sm text-slate-400">
                      • {formatWorkHistoryEntry(e)}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No work history available</p>
                )}
              </div>
            </div>

            {/* Skills */}
            {Array.isArray(expert.skills) && expert.skills.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="text-sm font-medium text-slate-200">Skills</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {expert.skills.slice(0, 15).map((s: unknown, i: number) => (
                    <span
                      key={i}
                      className="inline-flex px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300"
                    >
                      {typeof s === 'string' ? s : String(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scholar / Verified Badges */}
            {(expert.citationCount != null ||
              expert.patentCount != null ||
              expert.professionalAuthorityIndex != null ||
              expert.verifiedBadgeProvider) && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="text-sm font-medium text-slate-200">Verified Badges</h4>
                <div className="mt-3 space-y-1 text-sm text-slate-400">
                  {expert.verifiedBadgeProvider && (
                    <p>Provider: {expert.verifiedBadgeProvider}</p>
                  )}
                  {expert.verifiedAt && (
                    <p>Verified at: {new Date(expert.verifiedAt).toLocaleDateString()}</p>
                  )}
                  {expert.citationCount != null && expert.citationCount > 0 && (
                    <p>Citations: {expert.citationCount}</p>
                  )}
                  {expert.patentCount != null && expert.patentCount > 0 && (
                    <p>Patents: {expert.patentCount}</p>
                  )}
                  {expert.professionalAuthorityIndex != null && (
                    <p>Authority index: {expert.professionalAuthorityIndex.toFixed(2)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Source References */}
            {expert.sources && expert.sources.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Source References
                </h4>
                <div className="mt-3 space-y-2">
                  {expert.sources.map((s) => (
                    <div key={s.id} className="text-sm">
                      <span className="text-slate-500">{s.sourceType}:</span>{' '}
                      {s.sourceUrl ? (
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 truncate block"
                        >
                          {s.sourceUrl}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                      <span className="text-xs text-slate-600 ml-1">
                        {new Date(s.retrievedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagements */}
            {expert.engagements && expert.engagements.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="text-sm font-medium text-slate-200">Recent Engagements</h4>
                <div className="mt-3 space-y-2">
                  {expert.engagements.slice(0, 8).map((e) => (
                    <div key={e.id} className="text-sm text-slate-400">
                      <span className="text-slate-500">
                        {new Date(e.date).toLocaleDateString()}
                      </span>{' '}
                      · {e.subjectMatter} · {e.clientFeedbackScore}/5
                      {e.actualCost != null && (
                        <span className="text-slate-500"> · ${e.actualCost.toFixed(0)}</span>
                      )}
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
