import { create } from 'zustand';

export interface ResearchProject {
  id: string;
  title: string;
  status: string;
  _count?: { results: number };
}

export interface ExpertDetail {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  country: string;
  region: string;
  seniorityScore: number;
  yearsExperience: number;
  predictedRate: number;
  visibilityStatus: string;
  contacts?: Array<{ type: string; value: string; isVerified?: boolean }>;
  reputationScore?: number | null;
  predictedRateRange?: { min: number; max: number; predicted_rate: number } | null;
  totalEngagements?: number;
  averageActualRate?: number | null;
  subjectFrequencyMap?: Record<string, number> | null;
  reliabilityIndex?: number | null;
  engagements?: Array<{
    id: string;
    subjectMatter: string;
    actualCost: number;
    clientFeedbackScore: number;
    date: string;
    durationMinutes: number;
  }>;
}

interface DashboardState {
  activeProjectId: string | null;
  selectedExpert: ExpertDetail | null;
  expertsVersion: number;
  setActiveProject: (id: string | null) => void;
  setSelectedExpert: (expert: ExpertDetail | null) => void;
  refreshExperts: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeProjectId: null,
  selectedExpert: null,
  expertsVersion: 0,
  setActiveProject: (id) => set({ activeProjectId: id }),
  setSelectedExpert: (expert) => set({ selectedExpert: expert }),
  refreshExperts: () => set((s) => ({ expertsVersion: s.expertsVersion + 1 })),
}));
