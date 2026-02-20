/**
 * Expert Intelligence Platform - Type Definitions
 * Aligned with Prisma schema and research workflow
 */

export type VisibilityStatus = 'PRIVATE' | 'GLOBAL_POOL';
export type ProjectStatus = 'PENDING' | 'RUNNING' | 'COMPLETED';
export type ClassificationTier = 'S' | 'A' | 'B' | 'C';
export type TicketStatus = 'OPEN' | 'APPROVED' | 'REJECTED';
export type ContactType = 'EMAIL' | 'PHONE';

/** Research session status for UI state machine */
export type ResearchSessionStatus = 'idle' | 'scraping' | 'scoring' | 'complete';

/** Execution mode for research */
export type ExecutionMode = 'online_only' | 'database_only' | 'hybrid';

/** Geo region presets */
export type GeoRegion = 'MENA' | 'DACH' | 'LATAM' | 'APAC' | 'NA' | 'EMEA' | string;

export interface ExpertContact {
  id?: string;
  type: ContactType;
  value: string;
  isVerified: boolean;
  source?: string | null;
}

export interface Expert {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  country: string;
  region: string;
  seniorityScore: number;
  yearsExperience: number;
  predictedRate: number;
  visibilityStatus: VisibilityStatus;
  pastEmployers?: string[] | null;
  skills?: string[] | null;
  contacts?: ExpertContact[];
  createdAt?: Date;
  updatedAt?: Date;
}

/** Expert as returned from research / ML pipeline */
export interface ResearchExpert extends Expert {
  isExisting: boolean;
  similarityScore: number;
  predictedRate: number;
  rateConfidence?: number;
  ownerName?: string | null;
  ownerId?: string | null;
  /** Days until expert goes to Global Pool (if PRIVATE) */
  daysUntilGlobal?: number | null;
  /** Classification from ML (S/A/B/C) */
  classificationTier?: ClassificationTier;
}

export interface ActiveProject {
  id: string;
  title: string;
  status: ResearchSessionStatus;
}

export interface ResearchFilters {
  industry?: string;
  subIndustry?: string;
  countries?: string[];
  regions?: GeoRegion[];
  rateMin?: number;
  rateMax?: number;
  usePredictedRange?: boolean;
  seniorityMin?: number;
  seniorityMax?: number;
  yearsExperienceMin?: number;
  yearsExperienceMax?: number;
  languages?: Array<{ code: string; confidence: number }>;
  executionMode?: ExecutionMode;
  brief?: string;
  query?: string;
  clientBlacklist?: string[];
  restrictedIndustries?: string[];
}

export interface ResearchUIState {
  activeTab: 'new_matches' | 'existing_db';
  selectedExpertId: string | null;
  openTicketFor: { expertId: string; ownerId: string; ownerName?: string } | null;
}

export interface TicketFormData {
  expertId: string;
  requesterId: string;
  ownerId: string;
  message?: string;
}
