import { z } from 'zod';

// Project type determines the workflow complexity
export const ProjectTypeEnum = z.enum(['NEW_PROJECT', 'NEW_FEATURE', 'BUG_FIX']);
export type ProjectType = z.infer<typeof ProjectTypeEnum>;

// Base schema for all project types
const BaseSchema = z.object({
  name: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must be under 100 characters'),
  client: z
    .string()
    .min(2, 'Client name is required'),
  projectType: ProjectTypeEnum.default('NEW_PROJECT'),
  targetCodebase: z
    .string()
    .optional()
    .describe('Existing project/repo to work in. Required for NEW_FEATURE and BUG_FIX.'),
});

// Full intake for NEW_PROJECT - requires all details
export const NewProjectSchema = BaseSchema.extend({
  projectType: z.literal('NEW_PROJECT'),
  problemStatement: z
    .string()
    .min(20, 'Please describe the problem in more detail (at least 20 characters)')
    .max(2000, 'Problem statement must be under 2000 characters'),
  targetUsers: z
    .string()
    .min(10, 'Please describe the target users (at least 10 characters)')
    .max(1000, 'Target users description must be under 1000 characters'),
  keyWorkflows: z
    .string()
    .min(10, 'Please describe key workflows (at least 10 characters)')
    .max(2000, 'Key workflows must be under 2000 characters'),
  successCriteria: z
    .string()
    .min(10, 'Please define success criteria (at least 10 characters)')
    .max(1000, 'Success criteria must be under 1000 characters'),
  constraints: z.string().max(1000).optional(),
  timeline: z.string().max(200).optional(),
  budget: z.string().max(200).optional(),
});

// Feature intake - needs target codebase + feature description
export const NewFeatureSchema = BaseSchema.extend({
  projectType: z.literal('NEW_FEATURE'),
  targetCodebase: z
    .string()
    .min(1, 'Target codebase is required for features'),
  featureDescription: z
    .string()
    .min(20, 'Please describe the feature in detail (at least 20 characters)')
    .max(2000, 'Feature description must be under 2000 characters'),
  acceptanceCriteria: z
    .string()
    .min(10, 'Please define acceptance criteria')
    .max(1000, 'Acceptance criteria must be under 1000 characters'),
  timeline: z.string().max(200).optional(),
});

// Bug fix intake - minimal, just needs description
export const BugFixSchema = BaseSchema.extend({
  projectType: z.literal('BUG_FIX'),
  targetCodebase: z
    .string()
    .min(1, 'Target codebase is required for bug fixes'),
  bugDescription: z
    .string()
    .min(10, 'Please describe the bug (at least 10 characters)')
    .max(2000, 'Bug description must be under 2000 characters'),
  stepsToReproduce: z
    .string()
    .max(1000, 'Steps to reproduce must be under 1000 characters')
    .optional(),
  expectedBehavior: z
    .string()
    .max(500, 'Expected behavior must be under 500 characters')
    .optional(),
});

// Union schema that validates based on projectType
export const IntakeSchema = z.discriminatedUnion('projectType', [
  NewProjectSchema,
  NewFeatureSchema,
  BugFixSchema,
]);

export type IntakeData = z.infer<typeof IntakeSchema>;
export type NewProjectData = z.infer<typeof NewProjectSchema>;
export type NewFeatureData = z.infer<typeof NewFeatureSchema>;
export type BugFixData = z.infer<typeof BugFixSchema>;
