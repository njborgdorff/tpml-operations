import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  RateLimiters,
  getRateLimitHeaders,
  type RateLimitResult,
} from './rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Reset rate limit store between tests by testing different identifiers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
      const result = checkRateLimit('user-1', 'test-endpoint', {
        limit: 5,
        windowMs: 60000,
      });

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should block requests over the limit', () => {
      const identifier = 'user-block-test';
      const endpoint = 'test-endpoint-block';

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, endpoint, { limit: 5, windowMs: 60000 });
      }

      // 6th request should be blocked
      const result = checkRateLimit(identifier, endpoint, { limit: 5, windowMs: 60000 });
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeDefined();
    });

    it('should reset after window expires', () => {
      const identifier = 'user-reset-test';
      const endpoint = 'test-endpoint-reset';

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, endpoint, { limit: 5, windowMs: 60000 });
      }

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Should allow requests again
      const result = checkRateLimit(identifier, endpoint, { limit: 5, windowMs: 60000 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track different endpoints separately', () => {
      const identifier = 'user-separate';

      checkRateLimit(identifier, 'endpoint-a', { limit: 2, windowMs: 60000 });
      checkRateLimit(identifier, 'endpoint-a', { limit: 2, windowMs: 60000 });

      // endpoint-a is at limit
      const resultA = checkRateLimit(identifier, 'endpoint-a', { limit: 2, windowMs: 60000 });
      expect(resultA.success).toBe(false);

      // endpoint-b should still be available
      const resultB = checkRateLimit(identifier, 'endpoint-b', { limit: 2, windowMs: 60000 });
      expect(resultB.success).toBe(true);
    });
  });

  describe('RateLimiters', () => {
    it('aiPlanGeneration should have strict limits', () => {
      const result = RateLimiters.aiPlanGeneration('user-ai');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 = 4
    });

    it('projectCreation should have moderate limits', () => {
      const result = RateLimiters.projectCreation('user-proj');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1 = 9
    });

    it('statusPolling should have higher limits', () => {
      const result = RateLimiters.statusPolling('user-poll');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1 = 59
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return rate limit headers', () => {
      const result: RateLimitResult = {
        success: true,
        remaining: 5,
        resetAt: Date.now() + 60000,
      };

      const headers = getRateLimitHeaders(result);
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should include Retry-After when rate limited', () => {
      const result: RateLimitResult = {
        success: false,
        remaining: 0,
        resetAt: Date.now() + 30000,
        retryAfterSeconds: 30,
      };

      const headers = getRateLimitHeaders(result);
      expect(headers['Retry-After']).toBe('30');
    });
  });
});
