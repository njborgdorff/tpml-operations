/**
 * Standardized API response utilities
 *
 * Provides consistent response format across all API endpoints.
 */

import { NextResponse } from 'next/server';

// ============================================
// RESPONSE TYPES
// ============================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
  // Authentication/Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Business logic errors
  INVALID_STATE: 'INVALID_STATE',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create a success response
 */
export function success<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function error(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

// ============================================
// COMMON ERROR RESPONSES
// ============================================

export function unauthorized(message: string = 'Authentication required') {
  return error(ErrorCodes.UNAUTHORIZED, message, 401);
}

export function forbidden(message: string = 'Access denied') {
  return error(ErrorCodes.FORBIDDEN, message, 403);
}

export function notFound(resource: string = 'Resource') {
  return error(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
}

export function validationError(message: string, details?: Record<string, string[]>) {
  return error(ErrorCodes.VALIDATION_ERROR, message, 400, details);
}

export function invalidState(message: string) {
  return error(ErrorCodes.INVALID_STATE, message, 400);
}

export function invalidTransition(from: string, to: string) {
  return error(
    ErrorCodes.INVALID_TRANSITION,
    `Invalid transition from ${from} to ${to}`,
    400
  );
}

export function rateLimited(retryAfter?: number) {
  const response = error(
    ErrorCodes.RATE_LIMITED,
    'Too many requests. Please try again later.',
    429
  );
  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }
  return response;
}

export function internalError(message: string = 'An unexpected error occurred') {
  return error(ErrorCodes.INTERNAL_ERROR, message, 500);
}

// ============================================
// ERROR HANDLING WRAPPER
// ============================================

type RouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with standard error handling
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error('API Error:', err);

      if (err instanceof Error) {
        // Check for known error types
        if (err.message.includes('not found')) {
          return notFound();
        }
        if (err.message.includes('unauthorized')) {
          return unauthorized();
        }
      }

      return internalError();
    }
  };
}
