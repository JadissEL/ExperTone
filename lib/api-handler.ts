/**
 * Centralized API route handler wrapper.
 * Catches errors, logs them, and returns structured JSON responses.
 */
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { toJsonResponse } from '@/lib/errors';

export type ApiHandler<T = unknown> = () => Promise<NextResponse<T>>;

export async function withApiErrorHandler(handler: ApiHandler): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err) {
    const { status, body } = toJsonResponse(err);
    logger.error({ err, status, body }, 'API error');
    return NextResponse.json(body, { status });
  }
}
