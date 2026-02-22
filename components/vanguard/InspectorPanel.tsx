'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, MapPin, DollarSign, Star, History, BarChart2 } from 'lucide-react';
import { useVanguardStore } from '@/stores/vanguardStore';
import { useReducedMotion, getTransition } from '@/lib/vanguard/reduced-motion';
import { SPRING } from '@/lib/vanguard/motion';

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return <div className="h-12 rounded bg-expert-navy/50" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-expert-emerald"
        points={points}
      />
    </svg>
  );
}

const NOTES_KEY = 'vanguard-expert-notes';

export function InspectorPanel() {
  const activeExpert = useVanguardStore((s) => s.activeExpert);
  const setActiveExpert = useVanguardStore((s) => s.setActiveExpert);
  const [fullExpert, setFullExpert] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'pricing' | 'notes'>('overview');
  const [notes, setNotes] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const prevExpertIdRef = useRef<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeExpert) setActiveExpert(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeExpert, setActiveExpert]);

  useEffect(() => {
    if (activeExpert) {
      closeBtnRef.current?.focus({ preventScroll: true });
    }
  }, [activeExpert?.id]);

  const handleScroll = useCallback(() => {
    if (activeExpert?.id && scrollRef.current) {
      scrollPositions.current[activeExpert.id] = scrollRef.current.scrollTop;
    }
  }, [activeExpert?.id]);

  useEffect(() => {
    if (scrollRef.current && prevExpertIdRef.current) {
      scrollPositions.current[prevExpertIdRef.current] = scrollRef.current.scrollTop;
    }
    prevExpertIdRef.current = activeExpert?.id ?? null;
  }, [activeExpert?.id]);

  useEffect(() => {
    if (!loading && activeExpert?.id && scrollRef.current) {
      const saved = scrollPositions.current[activeExpert.id];
      scrollRef.current.scrollTop = saved ?? 0;
    }
  }, [activeExpert?.id, loading]);

  useEffect(() => {
    if (!activeExpert?.id) {
      setFullExpert(null);
      setNotes('');
      return;
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(`${NOTES_KEY}-${activeExpert.id}`) : null;
    setNotes(stored ?? '');
    setLoading(true);
    const ac = new AbortController();
    fetch(`/api/experts/${activeExpert.id}`, { credentials: 'include', signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ac.signal.aborted) setFullExpert(d ?? activeExpert);
      })
      .catch((err) => {
        if (!ac.signal.aborted && err?.name !== 'AbortError') {
          setFullExpert(activeExpert as unknown as Record<string, unknown>);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [activeExpert?.id]);

  const saveNotes = useCallback((expertId: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${NOTES_KEY}-${expertId}`, value);
    }
  }, []);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (activeExpert?.id) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveNotes(activeExpert.id, value), 500);
    }
  };

  const expert = fullExpert ?? activeExpert;

  const name = String(expert?.name ?? '');
  const industry = String(expert?.industry ?? '');
  const subIndustry = String(expert?.subIndustry ?? '');
  const country = String(expert?.country ?? '');
  const region = String(expert?.region ?? '');
  const seniorityScore = Number(expert?.seniorityScore ?? 50);
  const yearsExperience = Number(expert?.yearsExperience ?? 5);
  const predictedRate = Number(expert?.predictedRate ?? 0);
  const reputationScore = expert?.reputationScore as number | null | undefined;
  const trustStars = reputationScore != null ? Math.round(reputationScore * 5) : null;
  const engagements = ((expert as Record<string, unknown>)?.engagements as Array<{
    id: string;
    subjectMatter?: string;
    actualCost?: number | null;
    clientFeedbackScore?: number | null;
    date: string;
    durationMinutes?: number | null;
  }>) ?? [];

  return (
    <AnimatePresence>
      {activeExpert && (
      <motion.aside
        key={activeExpert.id}
        initial={reducedMotion ? false : { x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { x: 480, opacity: 0 }}
        transition={getTransition(reducedMotion, SPRING.default)}
        className="absolute inset-y-0 right-0 w-full sm:w-[450px] max-w-[min(450px,100vw)] z-overlay flex flex-col pointer-events-auto"
      >
        <div className="relative glass-float rounded-l-3xl border-l border-white/10 h-full flex flex-col overflow-hidden ml-2 shadow-float before:content-[''] before:absolute before:inset-0 before:rounded-l-3xl before:bg-gradient-to-br before:from-violet-500/5 before:via-transparent before:to-indigo-500/5 before:pointer-events-none">
          <div className="flex items-center justify-between p-4 border-b border-expert-frost-border/50 shrink-0">
            <h3 className="text-lg font-semibold text-slate-200 tracking-tight">Expert Profile</h3>
            <motion.button
              ref={closeBtnRef}
              onClick={() => setActiveExpert(null)}
              className="p-2 rounded-md hover:bg-expert-frost/50 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-expert-emerald/50 focus-visible:ring-offset-2 focus-visible:ring-offset-expert-navy"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING.snappy}
              aria-label="Close panel (Esc)"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          <div className="flex border-b border-expert-frost-border/50 shrink-0">
            {(['overview', 'history', 'pricing', 'notes'] as const).map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING.snappy}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-expert-emerald border-b-2 border-expert-emerald bg-expert-frost/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'overview' && <Briefcase className="w-4 h-4" />}
                {tab === 'history' && <History className="w-4 h-4" />}
                {tab === 'pricing' && <BarChart2 className="w-4 h-4" />}
                {tab === 'notes' && <Star className="w-4 h-4" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </motion.button>
            ))}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Loading...
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-expert-emerald/20 flex items-center justify-center text-lg font-semibold text-expert-emerald">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{name}</p>
                  <p className="text-sm text-slate-400">{industry}</p>
                  {subIndustry && <p className="text-xs text-slate-500">{subIndustry}</p>}
                </div>
              </div>

              {trustStars != null && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm">
                    Trust: {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={s <= trustStars ? 'text-amber-400' : 'text-slate-600'}
                      >
                        ★
                      </span>
                    ))}{' '}
                    ({((reputationScore ?? 0) * 100).toFixed(0)})
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>
                    {region && country ? `${region}, ${country}` : country || region || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>{yearsExperience} yrs · Seniority {seniorityScore}%</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-expert-emerald">${predictedRate}/hr</span>
                </div>
              </div>

              {activeTab === 'history' && (
                <div className="rounded-lg bg-expert-navy/60 border border-expert-frost-border overflow-hidden">
                  <p className="text-xs text-slate-500 px-3 py-2 border-b border-expert-frost-border/50">
                    Engagement history
                  </p>
                  <div className="max-h-48 overflow-y-auto">
                    {engagements.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-slate-500">No engagements yet</p>
                    ) : (
                      <ul className="divide-y divide-expert-frost-border/30">
                        {engagements.map((eng) => (
                          <li key={eng.id} className="px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-300 truncate">{eng.subjectMatter ?? 'Engagement'}</span>
                              <span className="text-slate-500 text-xs shrink-0">
                                {eng.date ? new Date(eng.date).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                              {eng.actualCost != null && (
                                <span className="text-expert-emerald">${eng.actualCost}</span>
                              )}
                              {eng.durationMinutes != null && (
                                <span>{eng.durationMinutes} min</span>
                              )}
                              {eng.clientFeedbackScore != null && (
                                <span className="text-amber-400">
                                  ★ {eng.clientFeedbackScore.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="rounded-lg bg-expert-navy/60 border border-expert-frost-border p-3">
                  <p className="text-xs text-slate-500 mb-2">Cost history</p>
                  <Sparkline
                    data={
                      engagements.filter((e) => e.actualCost != null).length > 0
                        ? engagements
                            .filter((e) => e.actualCost != null)
                            .sort((a, b) => (a.date > b.date ? 1 : -1))
                            .map((e) => e.actualCost as number)
                        : [predictedRate * 0.9, predictedRate, predictedRate * 1.05, predictedRate * 0.95, predictedRate]
                    }
                  />
                  {engagements.filter((e) => e.actualCost != null).length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      From {engagements.filter((e) => e.actualCost != null).length} engagement(s)
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="rounded-lg bg-expert-navy/60 border border-expert-frost-border p-3">
                  <p className="text-xs text-slate-500 mb-2">Notes (autosave)</p>
                  <textarea
                    placeholder="Add notes..."
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    className="w-full h-24 px-2 py-1.5 rounded bg-expert-navy/80 border border-expert-frost-border text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-expert-emerald/40"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.aside>
      )}
    </AnimatePresence>
  );
}
