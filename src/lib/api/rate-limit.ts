/**
 * Simple in-memory rate limiter for API endpoints
 *
 * For production, consider using Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
};

// In-memory store for rate limiting
// Key format: `${identifier}:${endpoint}`
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  lastCleanup = now;
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  });
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param endpoint - The API endpoint being accessed
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  cleanupExpiredEntries();

  const { limit, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or window has expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSeconds,
    };
  }

  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Pre-configured rate limiters for specific endpoints
 */
export const RateLimiters = {
  /**
   * AI plan generation - expensive operation, strict limits
   */
  aiPlanGeneration: (userId: string) =>
    checkRateLimit(userId, 'generate-plan', {
      limit: 5,
      windowMs: 5 * 60 * 1000, // 5 per 5 minutes
    }),

  /**
   * Project creation - moderate limits
   */
  projectCreation: (userId: string) =>
    checkRateLimit(userId, 'create-project', {
      limit: 10,
      windowMs: 60 * 1000, // 10 per minute
    }),

  /**
   * Workflow transitions - reasonable limits
   */
  workflowTransition: (userId: string) =>
    checkRateLimit(userId, 'workflow-transition', {
      limit: 30,
      windowMs: 60 * 1000, // 30 per minute
    }),

  /**
   * Status polling - higher limits for real-time updates
   */
  statusPolling: (userId: string) =>
    checkRateLimit(userId, 'status-polling', {
      limit: 60,
      windowMs: 60 * 1000, // 60 per minute (1 per second)
    }),
};

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (result.retryAfterSeconds) {
    headers['Retry-After'] = result.retryAfterSeconds.toString();
  }

  return headers;
}
