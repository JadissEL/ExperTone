/**
 * API instrumentation: request timing and slow-request logging.
 * Use in API routes for observability.
 */

import { logger } from '@/lib/logger';

const SLOW_THRESHOLD_MS = 2000;

/** Start a timer; call .done() when handler completes. Logs if slow. */
export function startRequestTimer(path: string, method: string = 'GET') {
  const start = Date.now();
  return {
    done: (status?: number) => {
      const ms = Date.now() - start;
      if (ms >= SLOW_THRESHOLD_MS) {
        logger.warn({ path, method, status, ms }, '[API] Slow request');
      } else if (process.env.LOG_LEVEL === 'debug') {
        logger.debug({ path, method, status, ms }, '[API] Request');
      }
    },
  };
}
