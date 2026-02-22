'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, MapPin, DollarSign, Star, Network, History, Award, ExternalLink } from 'lucide-react';
import { useDashboardStore, type ExpertDetail } from '@/stores/dashboardStore';
import { formatWorkHistoryEntry } from '@/lib/expert-display';
import { ExpertNetworkGraph } from './ExpertNetworkGraph';

type TabId = 'profile' | 'network' | 'historical';

interface MarketRateRange {
  min: number;
  max: number;
  predicted_rate: number;
}

export function ExpertSidePanel() {
  const { selectedExpert, setSelectedExpert } = useDashboardStore();
  const [fullExpert, setFullExpert] = useState<ExpertDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [marketRateRange, setMarketRateRange] = useState<MarketRateRange | null>(null);

  useEffect(() => {
    if (!selectedExpert?.id) {
      setFullExpert(null);
      setMarketRateRange(null);
      return;
    }
    setLoading(true);
    fetch(`/api/experts/${selectedExpert.id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const expertData = d ?? selectedExpert;
        setFullExpert(expertData);
        return expertData;
      })
      .catch(() => setFullExpert(selectedExpert))
      .finally(() => setLoading(false));
  }, [selectedExpert?.id]);

  const expert = fullExpert ?? selectedExpert;

  useEffect(() => {
    if (!expert?.id || loading) return;
    fetch('/api/ml/insights/suggested-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        expert_id: expert.id,
        seniority_score: expert.seniorityScore ?? 50,
        years_experience: expert.yearsExperience ?? 5,
        country: expert.country ?? '',
        region: expert.region ?? '',
        industry: expert.industry ?? 'Other',
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMarketRateRange({ min: d.suggested_rate_min, max: d.suggested_rate_max, predicted_rate: d.predicted_rate }))
      .catch(() => {
        const fallback = (expert as { averageActualRate?: number | null }).averageActualRate;
        if (fallback != null && fallback > 0) {
          setMarketRateRange({ min: fallback * 0.8, max: fallback * 1.2, predicted_rate: fallback });
        } else {
          setMarketRateRange(null);
        }
      });
  }, [expert?.id, expert?.seniorityScore, expert?.yearsExperience, expert?.country, expert?.region, expert?.industry, loading]);

  if (!expert) return null;

  const pastEmployers = (expert as ExpertDetail & { pastEmployers?: unknown })
    .pastEmployers;
  const skills = (expert as ExpertDetail & { skills?: unknown }).skills;
  const sources = (expert as ExpertDetail & { sources?: Array<{ sourceType: string; sourceUrl: string | null }> }).sources;
  const linkedinUrl = (expert as ExpertDetail & { linkedinUrl?: string | null }).linkedinUrl;
  const contacts = expert.contacts ?? [];
  const reputationScore = expert.reputationScore ?? null;
  const trustStars = reputationScore != null ? Math.round(reputationScore * 5) : null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, stiffness: 300, damping: 30 }}
        className="absolute inset-y-0 right-0 w-full max-w-sm z-30 flex flex-col pointer-events-auto"
      >
        <div className="glass-float rounded-l-[24px] border-l border-expert-frost-border h-full flex flex-col overflow-hidden shadow-float ml-2" style={{ boxShadow: '0 24px 48px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-slate-200">Expert Profile</h3>
            <button
              onClick={() => setSelectedExpert(null)}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'text-expert-sage border-b-2 border-expert-sage bg-expert-frost/50'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Briefcase className="w-4 h-4" /> Profile
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'network'
                  ? 'text-expert-sage border-b-2 border-expert-sage bg-expert-frost/50'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Network className="w-4 h-4" /> Network
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Loading...
            </div>
          ) : activeTab === 'network' ? (
            <div className="flex-1 overflow-hidden p-4">
              <ExpertNetworkGraph focusExpertId={expert.id} />
            </div>
          ) : activeTab === 'historical' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(expert.totalEngagements ?? 0) > 5 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-300">Frequent Contributor</span>
                </div>
              )}
              <div className="rounded-lg bg-slate-800/60 border border-slate-600/50 p-3">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Cost Benchmarking</h4>
                <div className="space-y-1.5 text-sm">
                  <p className="text-slate-300">
                    ML Predicted: <span className="text-emerald-400">${expert.predictedRate?.toFixed(0) ?? '—'}/hr</span>
                  </p>
                  <p className="text-slate-300">
                    Our historical average paid:{' '}
                    <span className="text-blue-300">
                      {expert.averageActualRate != null ? `$${expert.averageActualRate.toFixed(0)}/hr` : '—'}
                    </span>
                  </p>
                  {(expert.totalEngagements ?? 0) > 0 && expert.averageActualRate != null && expert.predictedRate > 0 && (
                    <p className="text-xs text-slate-500">
                      {expert.averageActualRate > expert.predictedRate ? 'Above' : 'Below'} predicted rate
                    </p>
                  )}
                </div>
              </div>
              {expert.subjectFrequencyMap && Object.keys(expert.subjectFrequencyMap).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Subject Mastery</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(expert.subjectFrequencyMap)
                      .sort((a, b) => b[1] - a[1])
                      .map(([subject, count]) => (
                        <span
                          key={subject}
                          className="px-2 py-1 rounded-md bg-slate-700/50 text-xs text-slate-300"
                          title={`${count} engagement(s)`}
                        >
                          {subject} ({count})
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {(expert.totalEngagements ?? 0) === 0 && !expert.subjectFrequencyMap && (
                <p className="text-sm text-slate-500">No engagement history yet.</p>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center text-lg font-semibold text-blue-300">
                  {expert.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{expert.name}</p>
                  <p className="text-sm text-slate-400">{expert.industry}</p>
                  {expert.subIndustry && (
                    <p className="text-xs text-slate-500">{expert.subIndustry}</p>
                  )}
                </div>
              </div>

              {trustStars != null && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm">
                    Trust Score: {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={s <= trustStars ? 'text-amber-400' : 'text-slate-600'}>★</span>
                    ))} ({((reputationScore ?? 0) * 100).toFixed(0)})
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">
                    {expert.region && expert.country
                      ? `${expert.region}, ${expert.country}`
                      : expert.country || expert.region || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">
                    {expert.yearsExperience} years exp · Seniority {expert.seniorityScore}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium text-emerald-400">
                    ${expert.predictedRate}/hr
                  </span>
                </div>
                {marketRateRange && (
                  <div className="rounded-lg bg-slate-800/60 border border-slate-600/50 p-2.5 text-xs">
                    <p className="font-medium text-slate-300 mb-1">Fair Market Value</p>
                    <p className="text-slate-400">
                      Suggested range: ${marketRateRange.min.toFixed(0)}–${marketRateRange.max.toFixed(0)}/hr
                      {expert.predictedRate > 0 && (
                        <span className={expert.predictedRate > marketRateRange.max ? ' text-amber-400' : expert.predictedRate < marketRateRange.min ? ' text-emerald-400' : ''}>
                          {' '}(declared ${expert.predictedRate}/hr)
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  Status: {expert.visibilityStatus}
                </div>
              </div>

              {Array.isArray(pastEmployers) && pastEmployers.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Past Employers
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {pastEmployers.slice(0, 5).map((e: unknown, i: number) => (
                      <li key={i}>• {formatWorkHistoryEntry(e)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(skills) && skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.slice(0, 8).map((s: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-700/50 text-xs text-slate-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {contacts.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Contacts
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {contacts.map((c: { type: string; value: string }, i: number) => (
                      <li key={i}>
                        {c.type}: {c.value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(sources?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Source References
                  </h4>
                  <div className="space-y-1 text-xs">
                    {linkedinUrl && (
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
                      >
                        LinkedIn <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {sources?.filter((s) => s.sourceUrl && s.sourceType !== 'linkedin').slice(0, 3).map((s, i) => (
                      <a
                        key={i}
                        href={s.sourceUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sky-400 hover:text-sky-300"
                      >
                        {s.sourceType}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
