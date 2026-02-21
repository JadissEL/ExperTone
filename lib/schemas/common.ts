/**
 * Shared Zod schemas for API validation.
 * Kept separate from api-validate to avoid pulling in next/server in tests.
 */
import { z } from 'zod';

export const commonSchemas = {
  cuid: z.string().min(1).max(64),
  uuid: z.string().uuid(),
  nonEmptyString: z.string().min(1).trim(),
  optionalString: z.string().trim().optional(),
  /** Optional CUID; empty string from query params becomes undefined */
  optionalCuid: z.preprocess(
    (s) => (typeof s === 'string' && s.trim() === '' ? undefined : s),
    z.string().min(1).max(64).optional()
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
};
