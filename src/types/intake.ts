import { z } from 'zod';

export const IntakeSchema = z.object({
  name: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must be under 100 characters'),
  client: z
    .string()
    .min(2, 'Client name is required'),
  targetCodebase: z
    .string()
    .optional()
    .describe('Existing project folder to work in (for bug fixes/enhancements). Leave empty for new projects.'),
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
  constraints: z
    .string()
    .max(1000, 'Constraints must be under 1000 characters')
    .optional(),
  timeline: z
    .string()
    .max(200, 'Timeline must be under 200 characters')
    .optional(),
  budget: z
    .string()
    .max(200, 'Budget must be under 200 characters')
    .optional(),
});

export type IntakeData = z.infer<typeof IntakeSchema>;
