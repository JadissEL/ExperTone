/**
 * Zod-based validation for API routes.
 * Use parseBody, parseQuery to validate and return structured errors.
 */
import { z, type ZodSchema } from 'zod';
import { NextResponse } from 'next/server';

export function parseBody<T>(schema: ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.flatten();
  return {
    success: false,
    response: NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: issues.fieldErrors,
      },
      { status: 400 }
    ),
  };
}

export function parseParams<T>(schema: ZodSchema<T>, params: Record<string, string | undefined>): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.flatten();
  return {
    success: false,
    response: NextResponse.json(
      {
        error: 'Invalid path parameters',
        code: 'VALIDATION_ERROR',
        details: issues.fieldErrors,
      },
      { status: 400 }
    ),
  };
}

export function parseQuery<T>(schema: ZodSchema<T>, params: URLSearchParams | Record<string, string | string[] | undefined>): { success: true; data: T } | { success: false; response: NextResponse } {
  const obj: Record<string, string | string[]> = {};
  const entries = params instanceof URLSearchParams ? params.entries() : Object.entries(params);
  for (const [k, v] of entries) {
    if (v !== undefined) obj[k] = Array.isArray(v) ? v : v;
  }
  const result = schema.safeParse(obj);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.flatten();
  return {
    success: false,
    response: NextResponse.json(
      {
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: issues.fieldErrors,
      },
      { status: 400 }
    ),
  };
}

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
