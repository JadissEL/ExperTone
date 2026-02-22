/**
 * Zod schemas for API route validation.
 * All request bodies and query params must be validated before use.
 */
import { z } from 'zod';
import { commonSchemas } from '@/lib/schemas/common';

// --- Search ---
export const searchBodySchema = z.object({
  query: z.string().min(1).max(8000).trim(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

// --- Experts ---
export const expertsQuerySchema = z.object({
  projectId: commonSchemas.optionalCuid,
  search: commonSchemas.optionalString,
});

// --- Experts [id] ---
export const expertIdParamsSchema = z.object({ id: commonSchemas.cuid });
export const expertIdQuerySchema = z.object({
  projectId: commonSchemas.optionalCuid,
});

// --- Tickets ---
export const ticketBodySchema = z.object({
  expertId: commonSchemas.cuid,
  ownerId: commonSchemas.cuid,
  requesterId: commonSchemas.cuid.optional(),
  message: z.string().max(2000).optional(),
});

// --- Hunter search ---
export const hunterSearchBodySchema = z.object({
  query: z.string().min(1).max(8000).trim(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(100),
  nameFilter: z.string().max(200).trim().optional(),
});

// --- Projects ---
export const projectIdParamsSchema = z.object({ id: commonSchemas.cuid });

// --- Expert resolve (identity disambiguation) ---
export const expertResolveQuerySchema = z.object({
  name: z.string().min(1).max(500).trim(),
  projectId: commonSchemas.optionalCuid,
  expertId: commonSchemas.optionalCuid,
  matchScore: z.coerce.number().min(0).max(1).optional(),
});

// --- Hunter add-to-project ---
export const addToProjectBodySchema = z.object({
  expertId: commonSchemas.cuid,
  projectId: commonSchemas.cuid,
  matchScore: z.number().min(0).max(1).optional(),
});

// --- Webhook n8n callback ---
const inboundExpertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(500),
  industry: z.string().max(200).optional(),
  sub_industry: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  seniority_score: z.number().min(0).max(100).optional(),
  years_experience: z.number().min(0).max(50).optional(),
  predicted_rate: z.number().min(0).optional(),
  contacts: z
    .array(z.object({ type: z.string(), value: z.string() }))
    .optional(),
  already_existing_flag: z.boolean().optional(),
  source_verified: z.boolean().optional(), // false = Minimal Callback (no scraped sources)
  linkedin_url: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.string().url().max(500).optional()),
  career_history: z.array(z.string()).optional(), // for pastEmployers
  skills: z.array(z.string()).optional(),
});

export const n8nCallbackBodySchema = z
  .object({
    projectId: z.string().min(1).optional(),
    project_id: z.string().min(1).optional(),
    experts: z.array(inboundExpertSchema).optional().default([]),
    status: z.string().optional(),
    batch_index: z.number().optional(),
    complete: z.boolean().optional(),
  })
  .refine((d) => (d.projectId?.trim() ?? d.project_id?.trim() ?? '') !== '', {
    message: 'projectId or project_id is required',
    path: ['projectId'],
  });

// --- ML embeddings ---
export const embeddingsBodySchema = z.object({
  texts: z.array(z.string().min(1).max(8000)).min(1).max(100),
});

// --- ML embeddings proxy (single text) ---
export const mlEmbeddingBodySchema = z.object({
  text: z.string().min(1).max(8000).trim(),
});

// --- ML rank proxy ---
export const mlRankBodySchema = z.object({
  project_id: commonSchemas.cuid,
});

// --- ML predict-rate proxy ---
export const mlPredictRateBodySchema = z.object({
  text: z.string().min(20).max(10000),
});

// --- ML graph visualize ---
export const mlGraphVisualizeBodySchema = z.object({
  limit: z.number().int().min(1).max(2000).optional().default(500),
});

// --- ML suggested-rate ---
export const mlSuggestedRateBodySchema = z.object({
  expert_id: z.string().max(64).optional(),
  seniority_score: z.number().min(0).max(100).optional(),
  years_experience: z.number().min(0).max(50).optional(),
  country: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  industry: z.string().max(200).optional(),
});

// --- ML rank ---
export const rankBodySchema = z.object({
  query: z.string().min(1).max(8000),
  expertIds: z.array(commonSchemas.cuid).min(1).max(200),
});

// --- ML predict-rate ---
export const predictRateBodySchema = z.object({
  seniority_score: z.number().min(0).max(100).optional(),
  years_experience: z.number().min(0).max(50).optional(),
  country: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  industry: z.string().max(200).optional(),
});

// --- Research trigger ---
export const researchTriggerBodySchema = z.object({
  projectTitle: z.string().max(500).optional(),
  filters: z.record(z.unknown()).optional(),
  clientBlacklist: z.array(z.string()).optional(),
  restrictedIndustries: z.array(z.string()).optional(),
});

// --- Hunter trigger (dispatch) ---
export const hunterTriggerBodySchema = z.object({
  projectId: commonSchemas.cuid,
  query: z.string().min(1).max(8000),
});

// --- Hunter trigger (proactive hunt) ---
export const hunterTriggerProactiveBodySchema = z.object({
  projectId: commonSchemas.optionalCuid,
  projectTitle: z.string().max(500).optional(),
  filterCriteria: z.record(z.unknown()).optional(),
  query: z.string().max(8000).optional(),
});

// --- Coordinator tasks ---
export const coordinatorTasksQuerySchema = z.object({
  projectId: commonSchemas.cuid,
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
});

// --- Coordinator run ---
export const coordinatorRunBodySchema = z.object({
  projectId: commonSchemas.cuid,
  brief: z.string().min(1).max(8000),
});

// --- Coordinator create-expert ---
export const createExpertBodySchema = z.object({
  name: z.string().min(1).max(500),
  industry: z.string().max(200).optional().default('Other'),
  subIndustry: z.string().max(200).optional().default('General'),
  country: z.string().max(100).optional().default('Unknown'),
  region: z.string().max(100).optional().default('Unknown'),
  seniorityScore: z.number().min(0).max(100).optional().default(50),
  yearsExperience: z.number().min(0).max(50).optional().default(5),
  predictedRate: z.number().min(0).optional().default(150),
  projectId: commonSchemas.cuid,
});

// --- Interventions ---
export const interventionsQuerySchema = z.object({
  projectId: commonSchemas.optionalCuid,
  status: z.enum(['OPEN', 'RESOLVED']).optional(),
});

// --- Interventions [id] resolve ---
export const resolveInterventionBodySchema = z.object({
  action: z.preprocess(
    (v) => (typeof v === 'string' ? v.toUpperCase() : v),
    z.enum(['PROCEED', 'DISCARD'])
  ),
});
export const interventionIdParamsSchema = z.object({ id: commonSchemas.cuid });

// --- Check exists (n8n) ---
export const checkExistsQuerySchema = z
  .object({
    name: z.string().max(500).optional(),
    linkedin_url: z.string().max(500).optional(),
    email_hash: z.string().max(128).optional(),
    request_id: z.string().max(100).optional(),
  })
  .refine((d) => (d.name?.trim() ?? '') !== '' || (d.linkedin_url?.trim() ?? '') !== '' || (d.email_hash?.trim() ?? '') !== '', {
    message: 'At least one of name, linkedin_url, email_hash required',
    path: ['name'],
  });

// --- Interventions POST (n8n register) ---
export const interventionsPostBodySchema = z.object({
  project_id: z.string().min(1).max(64),
  request_id: z.string().min(1).max(100),
  expert_payload: z.record(z.unknown()).optional(),
  score: z.number().optional(),
  n8n_resume_url: z.string().url().max(2000),
});

// --- Contact attempt ---
export const contactAttemptBodySchema = z.object({
  projectId: commonSchemas.cuid.optional(),
});

// --- Admin bulk-reclaim ---
export const bulkReclaimBodySchema = z.object({
  targetId: commonSchemas.cuid.optional(),
});

// --- Admin reassign ---
export const reassignBodySchema = z.object({
  newOwnerId: commonSchemas.cuid,
});

// --- Admin user role ---
export const userRoleBodySchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

// --- Admin decay ---
export const decayBodySchema = z.object({
  factor: z.number().min(0).max(1).optional(),
});

// --- Admin decay config ---
export const decayConfigBodySchema = z.object({
  enabled: z.boolean().optional(),
  factor: z.number().min(0).max(1).optional(),
});

// --- Admin ml-sensitivity ---
export const mlSensitivityBodySchema = z.object({
  sensitivity: z.number().min(0).max(1),
});

// --- Projects POST (create) ---
export const createProjectBodySchema = z.object({
  title: z.string().min(1).max(500),
  industry: z.string().max(200).optional(),
});

// --- Task id params ---
export const taskIdParamsSchema = z.object({ id: commonSchemas.cuid });

// --- Projects [id] rerank ---
export const rerankBodySchema = z.object({
  expertIds: z.array(commonSchemas.cuid).min(1).max(500),
});

// --- Agent stream ---
export const agentStreamBodySchema = z.object({
  projectId: commonSchemas.cuid.optional(),
  message: z.string().min(1).max(10000),
});

// --- Me contribution ---
export const contributionBodySchema = z.object({
  expertId: commonSchemas.cuid,
  subjectMatter: z.string().max(500).optional(),
  feedbackScore: z.number().min(1).max(5).optional(),
});

// --- Compliance scan ---
export const complianceScanBodySchema = z.object({
  expertIds: z.array(commonSchemas.cuid).min(1).max(100).optional(),
});

// --- Admin settings ---
export const adminSettingsBodySchema = z.record(z.unknown());

// --- Admin ownership ---
export const ownershipQuerySchema = z.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
});

// --- Admin audit ---
export const auditQuerySchema = z.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  userId: commonSchemas.cuid.optional(),
});

// --- Admin users ---
export const adminUsersQuerySchema = z.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
});

// --- Admin high-value-tags ---
export const highValueTagsBodySchema = z.object({
  tags: z.array(z.string().max(100)).optional(),
});

// --- Admin liquidity trigger-scrape ---
export const liquidityTriggerBodySchema = z.object({
  source: z.string().max(100).optional(),
});
