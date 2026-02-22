'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FLOAT } from '@/lib/vanguard/motion';
import {
  COUNTRIES_BY_REGION,
  GEO_REGIONS,
  INDUSTRIES,
  LANGUAGES,
  SUB_INDUSTRIES,
  type ResearchFilterFormValues,
} from '@/lib/research-filter-schema';

type Message = { role: 'assistant' | 'client'; text: string };

const AUTO_EXPANSION: Record<string, string[]> = {
  energy: ['Grid Infrastructure', 'Battery Storage', 'Regulatory Policy'],
  healthcare: ['Clinical Ops', 'Regulatory Affairs', 'Market Access'],
  fintech: ['Payments', 'Risk & Fraud', 'Lending'],
};

function suggestFromBrief(brief: string): string[] {
  const b = brief.toLowerCase();
  const suggestions = new Set<string>();
  for (const [key, values] of Object.entries(AUTO_EXPANSION)) {
    if (b.includes(key)) values.forEach((v) => suggestions.add(v));
  }
  return Array.from(suggestions);
}

const defaultFilters: ResearchFilterFormValues = {
  industry: '',
  subIndustry: '',
  countries: [],
  regions: [],
  rateMin: 0,
  rateMax: 2000,
  usePredictedRange: true,
  seniorityMin: 0,
  seniorityMax: 100,
  yearsExperienceMin: 0,
  yearsExperienceMax: 50,
  languages: [],
  executionMode: 'hybrid',
  brief: '',
  query: '',
  clientBlacklist: [],
  restrictedIndustries: [],
};

export function ConciergeBriefBuilder() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [filters, setFilters] = React.useState<ResearchFilterFormValues>(defaultFilters);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      text: 'Describe your target expert profile. I will expand it into a precision brief.',
    },
  ]);
  const [briefInput, setBriefInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const suggestions = React.useMemo(() => suggestFromBrief(briefInput || filters.brief || ''), [briefInput, filters.brief]);
  const countryOptions = (filters.regions ?? []).flatMap((r) => COUNTRIES_BY_REGION[r] ?? []);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);

  const onSeedBrief = () => {
    const brief = briefInput.trim();
    if (!brief) return;
    setFilters((prev) => ({ ...prev, brief, query: brief }));
    addMessage({ role: 'client', text: brief });
    if (suggestions.length > 0) {
      addMessage({
        role: 'assistant',
        text: `Would you like to focus on ${suggestions.join(', ')}?`,
      });
    } else {
      addMessage({
        role: 'assistant',
        text: 'Great. Now refine industry, geography, seniority, rates, language, and compliance constraints.',
      });
    }
    setBriefInput('');
  };

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const criteriaCount = [
      filters.industry,
      filters.subIndustry,
      ...(filters.countries ?? []),
      ...(filters.regions ?? []),
      filters.rateMin,
      filters.rateMax,
      filters.seniorityMin,
      filters.seniorityMax,
      filters.yearsExperienceMin,
      filters.yearsExperienceMax,
      ...(filters.languages ?? []),
      filters.executionMode,
      filters.brief,
      filters.query,
      ...(filters.clientBlacklist ?? []),
      ...(filters.restrictedIndustries ?? []),
    ].filter((x) => x !== '' && x != null).length;

    try {
      const res = await fetch('/api/research/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filters: {
            ...filters,
            classificationCriteriaCount: criteriaCount,
          },
          projectTitle: (filters.brief || 'Concierge Brief').slice(0, 80),
          clientBlacklist: filters.clientBlacklist ?? [],
          restrictedIndustries: filters.restrictedIndustries ?? [],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to create project');
        return;
      }
      router.push(`/projects/${json.projectId}`);
    } catch {
      setError('Network error while starting project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      animate={reducedMotion ? false : { y: FLOAT.y }}
      transition={reducedMotion ? { duration: 0 } : { duration: FLOAT.duration, repeat: Infinity, ease: FLOAT.ease }}
      className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 mb-6 aether-luminous overflow-hidden"
    >
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold text-white">Concierge Brief Builder</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Consultative intake across 15+ criteria to feed Apex Hunter with precise scent.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4 max-h-44 overflow-y-auto">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`mb-2 text-sm ${m.role === 'assistant' ? 'text-left text-slate-300' : 'text-right text-sky-400'}`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={briefInput}
          onChange={(e) => setBriefInput(e.target.value)}
          placeholder='Example: "Energy Expert for GCC power market"'
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
        <button
          type="button"
          onClick={onSeedBrief}
          className="px-4 py-2.5 rounded-xl bg-aether-emerald text-slate-900 font-medium hover:bg-emerald-400 transition-colors"
        >
          Add
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, subIndustry: s }))}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/10 text-slate-300 hover:bg-aether-violet/20 hover:border-aether-violet/40 hover:text-violet-200 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <select
          value={filters.industry || ''}
          onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value, subIndustry: '' }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        >
          <option value="">Industry</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={filters.subIndustry || ''}
          onChange={(e) => setFilters((p) => ({ ...p, subIndustry: e.target.value }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        >
          <option value="">Sub-Industry</option>
          {(filters.industry ? SUB_INDUSTRIES[filters.industry] ?? [] : []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.executionMode || 'hybrid'}
          onChange={(e) => setFilters((p) => ({ ...p, executionMode: e.target.value as ResearchFilterFormValues['executionMode'] }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        >
          <option value="hybrid">Hybrid</option>
          <option value="online_only">Online only</option>
          <option value="database_only">Database only</option>
        </select>
        <input
          placeholder="Semantic query"
          value={filters.query || ''}
          onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <select
          value={(filters.regions ?? [])[0] ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, regions: e.target.value ? [e.target.value] : [] }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        >
          <option value="">Region</option>
          {GEO_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={(filters.countries ?? [])[0] ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, countries: e.target.value ? [e.target.value] : [] }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        >
          <option value="">Country</option>
          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          placeholder="Min $/hr"
          value={filters.rateMin ?? 0}
          onChange={(e) => setFilters((p) => ({ ...p, rateMin: Number(e.target.value) }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
        <input
          type="number"
          placeholder="Max $/hr"
          value={filters.rateMax ?? 2000}
          onChange={(e) => setFilters((p) => ({ ...p, rateMax: Number(e.target.value) }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <input
          type="number"
          placeholder="Min seniority"
          value={filters.seniorityMin ?? 0}
          onChange={(e) => setFilters((p) => ({ ...p, seniorityMin: Number(e.target.value) }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
        <input
          type="number"
          placeholder="Max seniority"
          value={filters.seniorityMax ?? 100}
          onChange={(e) => setFilters((p) => ({ ...p, seniorityMax: Number(e.target.value) }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
        <input
          type="number"
          placeholder="Min years exp"
          value={filters.yearsExperienceMin ?? 0}
          onChange={(e) => setFilters((p) => ({ ...p, yearsExperienceMin: Number(e.target.value) }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
        <input
          type="number"
          placeholder="Max years exp"
          value={filters.yearsExperienceMax ?? 50}
          onChange={(e) => setFilters((p) => ({ ...p, yearsExperienceMax: Number(e.target.value) }))}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <select
          value={filters.languages?.[0]?.code ?? ''}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              languages: e.target.value ? [{ code: e.target.value, confidence: 4 }] : [],
            }))
          }
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        >
          <option value="">Language</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <input
          placeholder="Client blacklist (comma-separated)"
          value={(filters.clientBlacklist ?? []).join(', ')}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              clientBlacklist: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
            }))
          }
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
        <input
          placeholder="Restricted industries (comma-separated)"
          value={(filters.restrictedIndustries ?? []).join(', ')}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              restrictedIndustries: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
            }))
          }
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-aether-violet/30"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !(filters.brief || '').trim()}
        className="px-5 py-2.5 rounded-xl font-semibold bg-aether-emerald text-slate-900 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-aether-emerald transition-colors shadow-glow-emerald"
      >
        {loading ? 'Launching...' : 'Launch Precision Hunt'}
      </button>
    </section>
  );
}
