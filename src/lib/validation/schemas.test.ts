import { describe, it, expect } from 'vitest';
import {
  workflowTransitionSchema,
  sprintUpdateSchema,
  sprintStatusPostSchema,
  projectApprovalSchema,
  projectKickoffSchema,
  validateInput,
} from './schemas';

describe('Validation Schemas', () => {
  describe('workflowTransitionSchema', () => {
    const validTransition = {
      projectId: 'proj-123',
      sprintId: 'sprint-456',
      fromStatus: 'IMPLEMENTING',
      toStatus: 'REVIEWING',
      fromRole: 'Implementer',
      toRole: 'Reviewer',
      decision: 'APPROVE',
      summary: 'Implementation complete, ready for review',
    };

    it('should validate a correct workflow transition', () => {
      const result = validateInput(workflowTransitionSchema, validTransition);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validTransition);
    });

    it('should accept optional handoffContent', () => {
      const withHandoff = { ...validTransition, handoffContent: '# Handoff doc' };
      const result = validateInput(workflowTransitionSchema, withHandoff);
      expect(result.success).toBe(true);
      expect(result.data?.handoffContent).toBe('# Handoff doc');
    });

    it('should reject missing projectId', () => {
      const { projectId: _projectId, ...invalid } = validTransition;
      const result = validateInput(workflowTransitionSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.errors?.projectId).toBeDefined();
    });

    it('should reject invalid workflow status', () => {
      const invalid = { ...validTransition, fromStatus: 'INVALID_STATUS' };
      const result = validateInput(workflowTransitionSchema, invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalid = { ...validTransition, fromRole: 'InvalidRole' };
      const result = validateInput(workflowTransitionSchema, invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty summary', () => {
      const invalid = { ...validTransition, summary: '' };
      const result = validateInput(workflowTransitionSchema, invalid);
      expect(result.success).toBe(false);
    });

    it('should reject summary that is too long', () => {
      const invalid = { ...validTransition, summary: 'x'.repeat(5001) };
      const result = validateInput(workflowTransitionSchema, invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('sprintUpdateSchema', () => {
    it('should validate empty object (all fields optional)', () => {
      const result = validateInput(sprintUpdateSchema, {});
      expect(result.success).toBe(true);
    });

    it('should validate with status', () => {
      const result = validateInput(sprintUpdateSchema, { status: 'IN_PROGRESS' });
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('IN_PROGRESS');
    });

    it('should validate with reviewSummary', () => {
      const result = validateInput(sprintUpdateSchema, { reviewSummary: 'Sprint completed successfully' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateInput(sprintUpdateSchema, { status: 'INVALID' });
      expect(result.success).toBe(false);
    });
  });

  describe('sprintStatusPostSchema', () => {
    it('should validate correct status document', () => {
      const result = validateInput(sprintStatusPostSchema, {
        statusDocument: 'Sprint 1 status: 80% complete',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional conversationLog', () => {
      const result = validateInput(sprintStatusPostSchema, {
        statusDocument: 'Status update',
        conversationLog: { messages: [] },
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty status document', () => {
      const result = validateInput(sprintStatusPostSchema, {
        statusDocument: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('projectApprovalSchema', () => {
    it('should validate APPROVED decision', () => {
      const result = validateInput(projectApprovalSchema, {
        decision: 'APPROVED',
        notes: 'Looks good!',
      });
      expect(result.success).toBe(true);
    });

    it('should validate REJECTED decision', () => {
      const result = validateInput(projectApprovalSchema, {
        decision: 'REJECTED',
      });
      expect(result.success).toBe(true);
    });

    it('should validate REVISION_REQUESTED decision', () => {
      const result = validateInput(projectApprovalSchema, {
        decision: 'REVISION_REQUESTED',
        notes: 'Please clarify scope',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid decision', () => {
      const result = validateInput(projectApprovalSchema, {
        decision: 'MAYBE',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('projectKickoffSchema', () => {
    it('should default autoStart to false', () => {
      const result = validateInput(projectKickoffSchema, {});
      expect(result.success).toBe(true);
      expect(result.data?.autoStart).toBe(false);
    });

    it('should accept autoStart: true', () => {
      const result = validateInput(projectKickoffSchema, { autoStart: true });
      expect(result.success).toBe(true);
      expect(result.data?.autoStart).toBe(true);
    });
  });
});

describe('validateInput helper', () => {
  it('should return success with data on valid input', () => {
    const result = validateInput(projectKickoffSchema, { autoStart: true });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ autoStart: true });
    expect(result.error).toBeUndefined();
  });

  it('should return error details on invalid input', () => {
    const result = validateInput(workflowTransitionSchema, {
      projectId: '',
      sprintId: '',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.errors).toBeDefined();
  });
});
