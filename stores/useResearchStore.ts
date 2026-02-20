import { create } from 'zustand';
import type {
  ActiveProject,
  ResearchExpert,
  ResearchFilters,
  ResearchUIState,
  ResearchSessionStatus,
} from '@/types/expert';

interface ResearchState {
  activeProject: ActiveProject | null;
  filters: ResearchFilters;
  results: ResearchExpert[];
  uiState: ResearchUIState;
}

interface ResearchActions {
  setActiveProject: (project: ActiveProject | null) => void;
  setProjectStatus: (status: ResearchSessionStatus) => void;
  setFilters: (filters: Partial<ResearchFilters>) => void;
  setResults: (results: ResearchExpert[]) => void;
  appendResults: (results: ResearchExpert[]) => void;
  setActiveTab: (tab: 'new_matches' | 'existing_db') => void;
  setSelectedExpertId: (id: string | null) => void;
  setOpenTicketFor: (v: { expertId: string; ownerId: string; ownerName?: string } | null) => void;
  reset: () => void;
}

const defaultFilters: ResearchFilters = {
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
};

const defaultUIState: ResearchUIState = {
  activeTab: 'new_matches',
  selectedExpertId: null,
  openTicketFor: null,
};

const initialState: ResearchState = {
  activeProject: null,
  filters: defaultFilters,
  results: [],
  uiState: defaultUIState,
};

export const useResearchStore = create<ResearchState & ResearchActions>((set) => ({
  ...initialState,

  setActiveProject: (project) =>
    set({ activeProject: project, results: project ? [] : [] }),

  setProjectStatus: (status) =>
    set((s) =>
      s.activeProject
        ? { activeProject: { ...s.activeProject, status } }
        : s
    ),

  setFilters: (filters) =>
    set((s) => ({
      filters: { ...s.filters, ...filters },
    })),

  setResults: (results) => set({ results }),

  appendResults: (results) =>
    set((s) => ({
      results: [...s.results, ...results],
    })),

  setActiveTab: (activeTab) =>
    set((s) => ({
      uiState: { ...s.uiState, activeTab },
    })),

  setSelectedExpertId: (selectedExpertId) =>
    set((s) => ({
      uiState: { ...s.uiState, selectedExpertId },
    })),

  setOpenTicketFor: (openTicketFor) =>
    set((s) => ({
      uiState: { ...s.uiState, openTicketFor },
    })),

  reset: () => set(initialState),
}));
