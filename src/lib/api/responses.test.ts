import { describe, it, expect } from 'vitest';
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  invalidState,
  invalidTransition,
  rateLimited,
  internalError,
  ErrorCodes,
} from './responses';

describe('API Response Utilities', () => {
  describe('success', () => {
    it('should create a success response with data', async () => {
      const response = success({ id: '123', name: 'Test' });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '123', name: 'Test' });
      expect(body.meta?.timestamp).toBeDefined();
    });

    it('should allow custom status code', async () => {
      const response = success({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe('unauthorized', () => {
    it('should create 401 response', async () => {
      const response = unauthorized();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(body.error.message).toBe('Authentication required');
    });

    it('should accept custom message', async () => {
      const response = unauthorized('Session expired');
      const body = await response.json();

      expect(body.error.message).toBe('Session expired');
    });
  });

  describe('forbidden', () => {
    it('should create 403 response', async () => {
      const response = forbidden();
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.FORBIDDEN);
    });
  });

  describe('notFound', () => {
    it('should create 404 response with resource name', async () => {
      const response = notFound('Project');
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(body.error.message).toBe('Project not found');
    });
  });

  describe('validationError', () => {
    it('should create 400 response with details', async () => {
      const response = validationError('Invalid input', {
        email: ['Invalid email format'],
        name: ['Name is required'],
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(body.error.details?.email).toContain('Invalid email format');
    });
  });

  describe('invalidState', () => {
    it('should create 400 response for state errors', async () => {
      const response = invalidState('Project must be approved before kickoff');
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.INVALID_STATE);
    });
  });

  describe('invalidTransition', () => {
    it('should create 400 response for transition errors', async () => {
      const response = invalidTransition('IMPLEMENTING', 'COMPLETED');
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.INVALID_TRANSITION);
      expect(body.error.message).toContain('IMPLEMENTING');
      expect(body.error.message).toContain('COMPLETED');
    });
  });

  describe('rateLimited', () => {
    it('should create 429 response', async () => {
      const response = rateLimited(60);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error.code).toBe(ErrorCodes.RATE_LIMITED);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('internalError', () => {
    it('should create 500 response', async () => {
      const response = internalError();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });
  });
});
