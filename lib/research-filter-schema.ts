import { z } from 'zod';

export const researchFilterSchema = z.object({
  industry: z.string().optional(),
  subIndustry: z.string().optional(),
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  rateMin: z.number().min(0).max(5000).optional(),
  rateMax: z.number().min(0).max(5000).optional(),
  usePredictedRange: z.boolean().optional(),
  seniorityMin: z.number().min(0).max(100).optional(),
  seniorityMax: z.number().min(0).max(100).optional(),
  yearsExperienceMin: z.number().min(0).max(50).optional(),
  yearsExperienceMax: z.number().min(0).max(50).optional(),
  languages: z
    .array(
      z.object({
        code: z.string(),
        confidence: z.number().min(1).max(5),
      })
    )
    .optional(),
  executionMode: z.enum(['online_only', 'database_only', 'hybrid']).optional(),
  brief: z.string().optional(),
  query: z.string().optional(),
  clientBlacklist: z.array(z.string()).optional(),
  restrictedIndustries: z.array(z.string()).optional(),
});

export type ResearchFilterFormValues = z.infer<typeof researchFilterSchema>;

export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Manufacturing',
  'Retail',
  'Energy',
  'Consulting',
  'Media',
  'Other',
] as const;

export const SUB_INDUSTRIES: Record<string, string[]> = {
  Technology: ['SaaS', 'FinTech', 'AI/ML', 'Cybersecurity', 'Cloud', 'Hardware'],
  Healthcare: ['Pharma', 'Biotech', 'MedTech', 'HealthTech', 'Clinical'],
  'Financial Services': ['Banking', 'Insurance', 'Asset Management', 'PE/VC'],
  Manufacturing: ['Automotive', 'Aerospace', 'Industrial', 'Consumer Goods'],
  Retail: ['E-commerce', 'Luxury', 'FMCG', 'Supply Chain'],
  Energy: ['Oil & Gas', 'Renewables', 'Utilities', 'Mining'],
  Consulting: ['Strategy', 'Operations', 'Digital', 'M&A'],
  Media: ['Entertainment', 'Publishing', 'Advertising', 'Gaming'],
  Other: ['General'],
};

export const GEO_REGIONS = ['MENA', 'DACH', 'LATAM', 'APAC', 'NA', 'EMEA'] as const;

export const COUNTRIES_BY_REGION: Record<string, string[]> = {
  MENA: ['UAE', 'Saudi Arabia', 'Egypt', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon'],
  DACH: ['Germany', 'Austria', 'Switzerland'],
  LATAM: ['Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile', 'Peru'],
  APAC: ['Japan', 'China', 'India', 'Singapore', 'Australia', 'South Korea', 'Indonesia'],
  NA: ['United States', 'Canada'],
  EMEA: ['United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Sweden'],
};

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
] as const;
