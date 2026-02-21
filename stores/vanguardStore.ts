/**
 * Vanguard Store — Zustand State Architecture
 * Filters, Sidebar, Active Expert, Loading, Scrape State
 */

import { create } from 'zustand';

export interface VanguardFilters {
  query: string;
  industry: string;
  subIndustry: string;
  region: string;
  country: string;
  rateMin: number | null;
  rateMax: number | null;
  seniorityMin: number | null;
  seniorityMax: number | null;
  availability: string[];
  conflictOfInterest: boolean | null;
  mnpiRisk: string[];
  [key: string]: unknown;
}

export interface ExpertSummary {
  id: string;
  name: string;
  industry: string;
  subIndustry?: string;
  country?: string;
  region?: string;
  seniorityScore?: number;
  yearsExperience?: number;
  predictedRate: number;
  visibilityStatus: string;
  matchScore?: number;
  reputationScore?: number | null;
  totalEngagements?: number;
  source?: 'agent' | 'internal';
}

interface VanguardState {
  // Sidebar
  navExpanded: boolean;
  navHoverMemory: boolean;
  setNavExpanded: (v: boolean) => void;
  setNavHoverMemory: (v: boolean) => void;
  toggleNav: () => void;

  // Filters (URL-synced, debounced)
  filters: VanguardFilters;
  filterExpanded: boolean;
  resultCount: number;
  setFilters: (fn: (prev: VanguardFilters) => VanguardFilters) => void;
  resetFilters: () => void;
  setFilterExpanded: (v: boolean) => void;
  setResultCount: (n: number) => void;

  // Active Expert (Inspector)
  activeExpert: ExpertSummary | null;
  setActiveExpert: (e: ExpertSummary | null) => void;

  // Loading & Scrape
  loading: boolean;
  scrapeActive: boolean;
  setLoading: (v: boolean) => void;
  setScrapeActive: (v: boolean) => void;

  // Project context
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  // Scroll depth (for adaptive translucency)
  scrollDepth: number;
  setScrollDepth: (v: number) => void;
}

const defaultFilters: VanguardFilters = {
  query: '',
  industry: '',
  subIndustry: '',
  region: '',
  country: '',
  rateMin: null,
  rateMax: null,
  seniorityMin: null,
  seniorityMax: null,
  availability: [],
  conflictOfInterest: null,
  mnpiRisk: [],
};

const store = create<VanguardState>((set) => ({
  navExpanded: false,
  navHoverMemory: false,
  setNavExpanded: (v) => set({ navExpanded: v }),
  setNavHoverMemory: (v) => set({ navHoverMemory: v }),
  toggleNav: () => set((s) => ({ navExpanded: !s.navExpanded })),

  filters: defaultFilters,
  filterExpanded: false,
  resultCount: 0,
  setFilters: (fn) => set((s) => ({ filters: fn(s.filters) })),
  resetFilters: () => set({ filters: defaultFilters }),
  setFilterExpanded: (v) => set({ filterExpanded: v }),
  setResultCount: (n) => set({ resultCount: n }),

  activeExpert: null,
  setActiveExpert: (e) => set({ activeExpert: e }),

  loading: false,
  scrapeActive: false,
  setLoading: (v) => set({ loading: v }),
  setScrapeActive: (v) => set({ scrapeActive: v }),

  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  scrollDepth: 0,
  setScrollDepth: (v) => set({ scrollDepth: v }),
}));

export const useVanguardStore = store;

/** Selectors for minimal re-renders — use these instead of full store when possible */
export const useVanguardFilters = () => store((s) => s.filters);
export const useVanguardSetFilters = () => store((s) => s.setFilters);
export const useVanguardFilterExpanded = () => store((s) => s.filterExpanded);
export const useVanguardSetFilterExpanded = () => store((s) => s.setFilterExpanded);
export const useVanguardResultCount = () => store((s) => s.resultCount);
export const useVanguardActiveExpert = () => store((s) => s.activeExpert);
export const useVanguardSetActiveExpert = () => store((s) => s.setActiveExpert);
export const useVanguardScrapeActive = () => store((s) => s.scrapeActive);
export const useVanguardNavExpanded = () => store((s) => s.navExpanded);
export const useVanguardSetNavExpanded = () => store((s) => s.setNavExpanded);
export const useVanguardSetNavHoverMemory = () => store((s) => s.setNavHoverMemory);
export const useVanguardScrollDepth = () => store((s) => s.scrollDepth);
