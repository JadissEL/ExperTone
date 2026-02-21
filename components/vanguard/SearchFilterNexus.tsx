'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, FolderOpen, ChevronDown } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { useVanguardStore } from '@/stores/vanguardStore';
import { SPRING } from '@/lib/vanguard/motion';

const QUICK_CHIPS = [
  { key: 'industry', label: 'Industry' },
  { key: 'geo', label: 'Geo' },
  { key: 'rate', label: 'Rate' },
  { key: 'availability', label: 'Availability' },
];

const FILTER_GROUPS = [
  {
    label: 'Identity',
    fields: [
      { key: 'industry', label: 'Industry', type: 'text', placeholder: 'e.g. Fintech' },
      { key: 'subIndustry', label: 'Sub-Industry', type: 'text', placeholder: 'e.g. Payments' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'e.g. MENA' },
      { key: 'country', label: 'Country', type: 'text', placeholder: 'e.g. UAE' },
      { key: 'seniorityMin', label: 'Seniority min (%)', type: 'number', placeholder: '0' },
      { key: 'seniorityMax', label: 'Seniority max (%)', type: 'number', placeholder: '100' },
    ],
  },
  {
    label: 'Commercial',
    fields: [
      { key: 'rateMin', label: 'Rate min ($/hr)', type: 'number', placeholder: '0' },
      { key: 'rateMax', label: 'Rate max ($/hr)', type: 'number', placeholder: '500' },
    ],
  },
  {
    label: 'Availability',
    fields: [
      { key: 'availability', label: 'Status', type: 'multi', options: ['Active', 'Recent', 'Stale'] },
    ],
  },
  {
    label: 'Risk',
    fields: [
      { key: 'conflictOfInterest', label: 'Conflict of Interest', type: 'toggle' },
      { key: 'mnpiRisk', label: 'MNPI Risk', type: 'multi', options: ['None', 'Low', 'High'] },
    ],
  },
];

export function SearchFilterNexus() {
  const searchParams = useSearchParams();
  const filters = useVanguardStore((s) => s.filters);
  const filterExpanded = useVanguardStore((s) => s.filterExpanded);
  const resultCount = useVanguardStore((s) => s.resultCount);
  const setFilters = useVanguardStore((s) => s.setFilters);
  const setFilterExpanded = useVanguardStore((s) => s.setFilterExpanded);
  const resetFilters = useVanguardStore((s) => s.resetFilters);
  const scrollDepth = useVanguardStore((s) => s.scrollDepth);
  const activeProjectId = useVanguardStore((s) => s.activeProjectId);
  const setActiveProjectId = useVanguardStore((s) => s.setActiveProjectId);
  const [localQuery, setLocalQuery] = useState(filters.query);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectOpen, setProjectOpen] = useState(false);
  const projectRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setProjectOpen(false);
    };
    if (projectOpen) document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [projectOpen]);

  useEffect(() => {
    setProjectsLoading(true);
    fetch('/api/projects', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, []);

  const debouncedSetQuery = useCallback(
    (() => {
      let t: ReturnType<typeof setTimeout>;
      return (v: string) => {
        setLocalQuery(v);
        clearTimeout(t);
        t = setTimeout(() => {
          setFilters((prev) => ({ ...prev, query: v }));
        }, 150);
      };
    })(),
    [setFilters]
  );

  useEffect(() => {
    const q = searchParams.get('q');
    const industry = searchParams.get('industry');
    const region = searchParams.get('region');
    const rateMin = searchParams.get('rateMin');
    const rateMax = searchParams.get('rateMax');
    if (q != null) {
      setLocalQuery(q);
      setFilters((prev) => ({ ...prev, query: q }));
    }
    if (industry) setFilters((prev) => ({ ...prev, industry }));
    if (region) setFilters((prev) => ({ ...prev, region }));
    if (rateMin) setFilters((prev) => ({ ...prev, rateMin: Number(rateMin) }));
    if (rateMax) setFilters((prev) => ({ ...prev, rateMax: Number(rateMax) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to hydrate from URL
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.industry) params.set('industry', filters.industry);
    if (filters.region) params.set('region', filters.region);
    if (filters.rateMin != null) params.set('rateMin', String(filters.rateMin));
    if (filters.rateMax != null) params.set('rateMax', String(filters.rateMax));
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    if (typeof window !== 'undefined' && window.history.replaceState) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [filters.query, filters.industry, filters.region, filters.rateMin, filters.rateMax]);

  const updateFilter = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getFilterValue = (key: string) => {
    const v = filters[key as keyof typeof filters];
    return v ?? (key === 'conflictOfInterest' ? null : key === 'availability' || key === 'mnpiRisk' ? [] : '');
  };

  const bgOpacity = 0.4 + scrollDepth * 0.35;
  const blurClass = scrollDepth > 0.5 ? 'vanguard-blur-deep' : 'vanguard-blur';

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const activeFilterChips: { key: string; label: string }[] = [];
  if (filters.query) activeFilterChips.push({ key: 'query', label: `"${filters.query}"` });
  if (filters.industry) activeFilterChips.push({ key: 'industry', label: `Industry: ${filters.industry}` });
  if (filters.region) activeFilterChips.push({ key: 'region', label: `Region: ${filters.region}` });
  if (filters.country) activeFilterChips.push({ key: 'country', label: `Country: ${filters.country}` });
  if (filters.rateMin != null) activeFilterChips.push({ key: 'rateMin', label: `Rate ≥ $${filters.rateMin}` });
  if (filters.rateMax != null) activeFilterChips.push({ key: 'rateMax', label: `Rate ≤ $${filters.rateMax}` });
  if (filters.availability?.length) activeFilterChips.push({ key: 'availability', label: `Status: ${filters.availability.join(', ')}` });
  if (filters.mnpiRisk?.length) activeFilterChips.push({ key: 'mnpiRisk', label: `Risk: ${filters.mnpiRisk.join(', ')}` });
  const hasActiveFilters = activeFilterChips.length > 0;

  const removeFilter = (key: string) => {
    if (key === 'query') {
      setLocalQuery('');
      setFilters((p) => ({ ...p, query: '' }));
    } else if (key === 'availability' || key === 'mnpiRisk') {
      setFilters((p) => ({ ...p, [key]: [] }));
    } else if (key === 'rateMin' || key === 'rateMax') {
      setFilters((p) => ({ ...p, [key]: null }));
    } else {
      setFilters((p) => ({ ...p, [key]: '' }));
    }
  };

  return (
    <div
      className={`relative min-h-[56px] shrink-0 flex items-center gap-3 px-4 border-b border-expert-frost-border transition-colors duration-200 ${blurClass}`}
      style={{ backgroundColor: `rgba(10, 25, 47, ${bgOpacity})` }}
    >
      <div ref={projectRef} className="relative shrink-0">
        <motion.button
          type="button"
          onClick={() => setProjectOpen(!projectOpen)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING.snappy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-expert-frost/50 text-slate-400 hover:text-slate-200 border border-expert-frost-border/50 min-w-[120px]"
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span className="truncate">{activeProject?.title ?? 'All experts'}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${projectOpen ? 'rotate-180' : ''}`} />
        </motion.button>
        <AnimatePresence>
          {projectOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING.snappy}
              className="absolute left-0 top-full mt-1 py-1 rounded-md bg-expert-navy/95 border border-expert-frost-border vanguard-blur-deep shadow-float z-modal min-w-[180px]"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveProjectId(null);
                  setProjectOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                  !activeProjectId ? 'text-expert-emerald bg-expert-emerald/10' : 'text-slate-400 hover:text-slate-200 hover:bg-expert-frost/50'
                }`}
              >
                All experts
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActiveProjectId(p.id);
                    setProjectOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-medium truncate transition-colors ${
                    activeProjectId === p.id ? 'text-expert-emerald bg-expert-emerald/10' : 'text-slate-400 hover:text-slate-200 hover:bg-expert-frost/50'
                  }`}
                >
                  {p.title}
                </button>
              ))}
              {projects.length === 0 && (
                <Link
                  href="/projects"
                  className="block px-3 py-2 text-xs text-expert-emerald hover:bg-expert-emerald/10"
                >
                  Create project →
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
        {activeFilterChips.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0 min-w-0 max-w-[35%] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeFilterChips.map((chip) => (
              <motion.button
                key={chip.key}
                type="button"
                onClick={() => removeFilter(chip.key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING.snappy}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-expert-emerald/20 text-expert-emerald border border-expert-emerald/40 hover:bg-expert-emerald/30"
              >
                {chip.label}
                <X className="w-3 h-3" />
              </motion.button>
            ))}
          </div>
        )}
        <div className="flex-1 flex items-center gap-2 min-w-0">
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Search experts..."
          value={localQuery}
          onChange={(e) => debouncedSetQuery(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-expert-emerald/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded px-1 -mx-1"
        />
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        {QUICK_CHIPS.map((chip) => (
          <motion.button
            key={chip.key}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING.snappy}
            onClick={() => setFilterExpanded(!filterExpanded)}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-expert-frost/50 text-slate-400 hover:text-slate-200 border border-expert-frost-border/50 hover:border-expert-frost-border"
          >
            {chip.label}
          </motion.button>
        ))}
      </div>

      <motion.button
        type="button"
        onClick={() => setFilterExpanded(!filterExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          filterExpanded
            ? 'bg-expert-emerald/20 text-expert-emerald border border-expert-emerald/40'
            : hasActiveFilters
              ? 'bg-expert-emerald/10 text-expert-emerald/90 border border-expert-emerald/30'
              : 'bg-expert-frost/50 text-slate-400 hover:text-slate-200 border border-expert-frost-border/50'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {hasActiveFilters && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-expert-emerald" />
        )}
      </motion.button>

      <span className="text-xs text-slate-500 tabular-nums shrink-0">
        {resultCount > 0 ? `${resultCount} results` : '—'}
      </span>

      <AnimatePresence>
        {filterExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING.default}
            className="absolute left-0 right-0 top-14 z-overlay overflow-hidden"
            style={{ willChange: 'height' }}
          >
            <div className="vanguard-blur-deep border-b border-expert-frost-border bg-expert-navy/95 p-4 space-y-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-200">Advanced Filters</h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetFilters();
                      setLocalQuery('');
                    }}
                    className="px-2 py-1 rounded text-[11px] font-medium text-slate-500 hover:text-slate-300 hover:bg-expert-frost/50"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => setFilterExpanded(false)}
                    className="p-1 rounded hover:bg-expert-frost/50 text-slate-500"
                    aria-label="Close filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {FILTER_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      {group.label}
                    </p>
                    <div className="space-y-2">
                      {group.fields.map((field) => {
                        if (field.type === 'toggle') {
                          const val = getFilterValue(field.key) as boolean | null;
                          return (
                            <div key={field.key} className="flex items-center gap-2">
                              <label className="text-xs text-slate-400">{field.label}</label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateFilter(
                                    field.key,
                                    val === true ? false : val === false ? null : true
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                  val === true
                                    ? 'bg-expert-amber-muted text-expert-amber-warning'
                                    : val === false
                                      ? 'bg-expert-emerald-muted text-expert-emerald'
                                      : 'bg-expert-frost/50 text-slate-500'
                                }`}
                              >
                                {val === true ? 'Yes' : val === false ? 'No' : 'Any'}
                              </button>
                            </div>
                          );
                        }
                        if (field.type === 'multi') {
                          const val = (getFilterValue(field.key) as string[]) || [];
                          return (
                            <div key={field.key}>
                              <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                              <div className="flex flex-wrap gap-1">
                                {(field.options || []).map((opt) => {
                                  const isOn = val.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        updateFilter(
                                          field.key,
                                          isOn ? val.filter((x) => x !== opt) : [...val, opt]
                                        )
                                      }
                                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                        isOn
                                          ? 'bg-expert-emerald/20 text-expert-emerald border border-expert-emerald/40'
                                          : 'bg-expert-frost/50 text-slate-500 border border-transparent'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        if (field.key === 'rateMin' || field.key === 'rateMax') {
                          const numVal = (getFilterValue(field.key) as number | null) ?? (field.key === 'rateMin' ? 0 : 500);
                          const sliderMin = field.key === 'rateMin' ? 0 : (filters.rateMin ?? 0);
                          const sliderMax = field.key === 'rateMax' ? 1000 : (filters.rateMax ?? 1000);
                          const clampedVal = Math.max(sliderMin, Math.min(sliderMax, numVal));
                          return (
                            <div key={field.key}>
                              <label className="block text-xs text-slate-500 mb-1">
                                {field.label} ({clampedVal})
                              </label>
                              <Slider.Root
                                className="relative flex w-full touch-none select-none items-center"
                                value={[clampedVal]}
                                onValueChange={([v]) => updateFilter(field.key, v)}
                                min={sliderMin}
                                max={sliderMax}
                                step={10}
                              >
                                <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-expert-navy/80">
                                  <Slider.Range className="absolute h-full rounded-full bg-expert-emerald/50" />
                                </Slider.Track>
                                <Slider.Thumb className="block h-3 w-3 rounded-full bg-expert-emerald shadow-glow-sage focus:outline-none focus:ring-2 focus:ring-expert-emerald/50" />
                              </Slider.Root>
                            </div>
                          );
                        }
                        return (
                          <div key={field.key}>
                            <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              value={
                                typeof getFilterValue(field.key) === 'number'
                                  ? (getFilterValue(field.key) as number) || ''
                                  : (getFilterValue(field.key) as string) || ''
                              }
                              onChange={(e) =>
                                updateFilter(
                                  field.key,
                                  field.type === 'number'
                                    ? (e.target.value ? Number(e.target.value) : null)
                                    : e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 rounded bg-expert-navy/80 border border-expert-frost-border text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-expert-emerald/40"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
