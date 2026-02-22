/**
 * Centralized error types for the application.
 * Use for consistent error handling and logging.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export function toJsonResponse(err: unknown): { status: number; body: { error: string; code?: string; details?: unknown; hint?: string } } {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: {
        error: err.message,
        code: err.code,
        ...(err instanceof ValidationError && err.details && { details: err.details }),
      },
    };
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return {
    status: 500,
    body: { error: message, code: 'INTERNAL_ERROR' },
  };
}

/** Standardized API error shape for NextResponse.json */
export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
  hint?: string;
};

/** Create NextResponse with standardized error format */
export function apiError(status: number, error: string, opts?: { code?: string; details?: unknown; hint?: string }) {
  const body: ApiErrorBody = { error, ...opts };
  return Response.json(body, { status });
}
