/**
 * Zod validation schemas for API request bodies
 *
 * Centralized validation ensures consistent input handling across all API routes.
 */

import { z } from 'zod';

// ============================================
// WORKFLOW SCHEMAS
// ============================================

export const workflowStatusSchema = z.enum([
  'IMPLEMENTING',
  'REVIEWING',
  'TESTING',
  'AWAITING_APPROVAL',
  'COMPLETED',
]);

export const workflowRoleSchema = z.enum(['Implementer', 'Reviewer', 'QA', 'PM']);

export const workflowDecisionSchema = z.enum([
  'APPROVE',
  'REJECT',
  'REQUEST_CHANGES',
  'FIX_REQUIRED',
  'ACCEPT',
]);

export const workflowTransitionSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  sprintId: z.string().min(1, 'Sprint ID is required'),
  fromStatus: workflowStatusSchema,
  toStatus: workflowStatusSchema,
  fromRole: workflowRoleSchema,
  toRole: workflowRoleSchema,
  decision: workflowDecisionSchema,
  summary: z.string().min(1, 'Summary is required').max(5000, 'Summary too long'),
  handoffContent: z.string().max(50000, 'Handoff content too long').optional(),
});

export type WorkflowTransitionInput = z.infer<typeof workflowTransitionSchema>;

// ============================================
// SPRINT SCHEMAS
// ============================================

export const sprintStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'ACTIVE',
  'REVIEW',
  'COMPLETED',
]);

export const sprintUpdateSchema = z.object({
  status: sprintStatusSchema.optional(),
  reviewSummary: z.string().max(10000, 'Review summary too long').optional(),
});

export type SprintUpdateInput = z.infer<typeof sprintUpdateSchema>;

export const sprintStatusPostSchema = z.object({
  statusDocument: z.string().min(1, 'Status document is required').max(50000),
  conversationLog: z.unknown().optional(),
  phase: z.string().optional(),
});

export type SprintStatusPostInput = z.infer<typeof sprintStatusPostSchema>;

// ============================================
// PROJECT SCHEMAS
// ============================================

export const projectApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'REVISION_REQUESTED', 'REJECTED']),
  notes: z.string().max(5000, 'Notes too long').optional(),
});

export type ProjectApprovalInput = z.infer<typeof projectApprovalSchema>;

export const projectKickoffSchema = z.object({
  autoStart: z.boolean().default(false),
});

export type ProjectKickoffInput = z.infer<typeof projectKickoffSchema>;

// ============================================
// INTAKE SCHEMAS
// ============================================

export const projectIntakeSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  businessName: z.string().min(1, 'Business name is required').max(200),
  projectName: z.string().min(1, 'Project name is required').max(200),
  projectDescription: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  targetAudience: z.string().max(1000).optional(),
  keyFeatures: z.string().max(3000).optional(),
  technicalRequirements: z.string().max(3000).optional(),
  timeline: z.string().max(500).optional(),
  budget: z.string().max(500).optional(),
  additionalNotes: z.string().max(5000).optional(),
});

export type ProjectIntakeInput = z.infer<typeof projectIntakeSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

/**
 * Validate input against a zod schema and return a typed result
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return {
    success: false,
    error: result.error.issues[0]?.message || 'Validation failed',
    errors,
  };
}
