'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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
    <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', background: '#fff' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Concierge Brief Builder</h2>
        <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Consultative intake across 15+ criteria to feed Apex Hunter with precise scent.
        </p>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.75rem', background: '#f8fafc', marginBottom: '0.75rem', maxHeight: 180, overflowY: 'auto' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 8,
              textAlign: m.role === 'assistant' ? 'left' : 'right',
              color: m.role === 'assistant' ? '#0f172a' : '#1d4ed8',
              fontSize: '0.88rem',
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={briefInput}
          onChange={(e) => setBriefInput(e.target.value)}
          placeholder='Example: "Energy Expert for GCC power market"'
          style={{ flex: 1, padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 8 }}
        />
        <button type="button" onClick={onSeedBrief} style={{ padding: '0.55rem 0.8rem', borderRadius: 8, border: '1px solid #0f172a', background: '#0f172a', color: '#fff' }}>
          Add
        </button>
      </div>

      {suggestions.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, subIndustry: s }))}
              style={{ marginRight: 6, marginBottom: 6, border: '1px solid #cbd5e1', borderRadius: 999, background: '#fff', padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
        <select value={filters.industry || ''} onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value, subIndustry: '' }))}>
          <option value="">Industry</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={filters.subIndustry || ''} onChange={(e) => setFilters((p) => ({ ...p, subIndustry: e.target.value }))}>
          <option value="">Sub-Industry</option>
          {(filters.industry ? SUB_INDUSTRIES[filters.industry] ?? [] : []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.executionMode || 'hybrid'} onChange={(e) => setFilters((p) => ({ ...p, executionMode: e.target.value as ResearchFilterFormValues['executionMode'] }))}>
          <option value="hybrid">Hybrid</option>
          <option value="online_only">Online only</option>
          <option value="database_only">Database only</option>
        </select>
        <input
          placeholder="Semantic query"
          value={filters.query || ''}
          onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
        <select
          value={(filters.regions ?? [])[0] ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, regions: e.target.value ? [e.target.value] : [] }))}
        >
          <option value="">Region</option>
          {GEO_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={(filters.countries ?? [])[0] ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, countries: e.target.value ? [e.target.value] : [] }))}
        >
          <option value="">Country</option>
          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          placeholder="Min $/hr"
          value={filters.rateMin ?? 0}
          onChange={(e) => setFilters((p) => ({ ...p, rateMin: Number(e.target.value) }))}
        />
        <input
          type="number"
          placeholder="Max $/hr"
          value={filters.rateMax ?? 2000}
          onChange={(e) => setFilters((p) => ({ ...p, rateMax: Number(e.target.value) }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
        <input
          type="number"
          placeholder="Min seniority"
          value={filters.seniorityMin ?? 0}
          onChange={(e) => setFilters((p) => ({ ...p, seniorityMin: Number(e.target.value) }))}
        />
        <input
          type="number"
          placeholder="Max seniority"
          value={filters.seniorityMax ?? 100}
          onChange={(e) => setFilters((p) => ({ ...p, seniorityMax: Number(e.target.value) }))}
        />
        <input
          type="number"
          placeholder="Min years exp"
          value={filters.yearsExperienceMin ?? 0}
          onChange={(e) => setFilters((p) => ({ ...p, yearsExperienceMin: Number(e.target.value) }))}
        />
        <input
          type="number"
          placeholder="Max years exp"
          value={filters.yearsExperienceMax ?? 50}
          onChange={(e) => setFilters((p) => ({ ...p, yearsExperienceMax: Number(e.target.value) }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <select
          value={filters.languages?.[0]?.code ?? ''}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              languages: e.target.value ? [{ code: e.target.value, confidence: 4 }] : [],
            }))
          }
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
        />
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '0.84rem', margin: '0 0 8px' }}>{error}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !(filters.brief || '').trim()}
        style={{
          padding: '0.55rem 0.9rem',
          borderRadius: 8,
          border: '1px solid #0f172a',
          background: loading ? '#94a3b8' : '#0f172a',
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        {loading ? 'Launching...' : 'Launch Precision Hunt'}
      </button>
    </section>
  );
}
