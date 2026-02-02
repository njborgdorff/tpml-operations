/**
 * Shared type definitions for Sprint, Project, and Workflow
 *
 * These types are used across API routes and components to ensure consistency.
 */

import type {
  ProjectStatus,
  ApprovalStatus,
  SprintStatus,
  ArtifactType,
} from '@prisma/client';

// Re-export Prisma enums for convenience
export type { ProjectStatus, ApprovalStatus, SprintStatus, ArtifactType };

// ============================================
// WORKFLOW TYPES
// ============================================

export type WorkflowStatus =
  | 'IMPLEMENTING'
  | 'REVIEWING'
  | 'TESTING'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED';

export type WorkflowRole = 'Implementer' | 'Reviewer' | 'QA' | 'PM';

export type WorkflowDecision =
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_CHANGES'
  | 'FIX_REQUIRED'
  | 'ACCEPT';

export const VALID_WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  IMPLEMENTING: ['REVIEWING'],
  REVIEWING: ['TESTING', 'IMPLEMENTING'],
  TESTING: ['AWAITING_APPROVAL', 'IMPLEMENTING'],
  AWAITING_APPROVAL: ['COMPLETED', 'IMPLEMENTING'],
  COMPLETED: [],
};

export const WORKFLOW_STATUS_TO_SPRINT_STATUS: Record<WorkflowStatus, SprintStatus> = {
  IMPLEMENTING: 'IN_PROGRESS',
  REVIEWING: 'REVIEW',
  TESTING: 'REVIEW',
  AWAITING_APPROVAL: 'REVIEW',
  COMPLETED: 'COMPLETED',
};

// ============================================
// SPRINT TYPES
// ============================================

export interface SprintDTO {
  id: string;
  number: number;
  name: string | null;
  goal: string | null;
  status: SprintStatus;
  workflowStatus?: WorkflowStatus;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SprintDetailDTO extends SprintDTO {
  project: {
    id: string;
    name: string;
    slug: string;
  };
  latestReview: SprintReviewDTO | null;
}

export interface SprintReviewDTO {
  id: string;
  statusDocument: string | null;
  createdAt: string;
}

// ============================================
// PROJECT TYPES
// ============================================

export interface ProjectDTO {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  approvalStatus: ApprovalStatus;
}

export interface ProjectDetailDTO extends ProjectDTO {
  intakeData: Record<string, unknown>;
  summary: string | null;
  approvalNotes: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: ClientDTO;
  sprints: SprintDTO[];
  artifacts: ArtifactDTO[];
}

export interface ClientDTO {
  id: string;
  name: string;
  slug: string;
}

// ============================================
// ARTIFACT TYPES
// ============================================

export interface ArtifactDTO {
  id: string;
  type: ArtifactType;
  name: string;
  content?: string;
  version: number;
  createdAt: string;
}

// ============================================
// STATUS UPDATE TYPES
// ============================================

export interface StatusUpdateDTO {
  id: string;
  status: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface LiveStatusDTO {
  projectId: string;
  status: ProjectStatus;
  activeSprint: SprintDTO | null;
  recentUpdates: StatusUpdateDTO[];
  lastUpdated: string;
}

// ============================================
// WORKFLOW TRANSITION TYPES
// ============================================

export interface WorkflowTransitionRequest {
  projectId: string;
  sprintId: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  fromRole: WorkflowRole;
  toRole: WorkflowRole;
  decision: WorkflowDecision;
  summary: string;
  handoffContent?: string;
}

export interface WorkflowTransitionResponse {
  success: boolean;
  transition: {
    from: { status: WorkflowStatus; role: WorkflowRole };
    to: { status: WorkflowStatus; role: WorkflowRole };
    decision: WorkflowDecision;
  };
  handoff: {
    filename: string;
    stored: boolean;
  };
}
