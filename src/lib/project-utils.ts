import { ProjectStatus } from '@prisma/client';

export const PROJECT_STATUS_LABELS = {
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  APPROVED: 'Approved',
  FINISHED: 'Finished'
} as const;

export const PROJECT_STATUS_COLORS = {
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  FINISHED: 'bg-gray-100 text-gray-800 border-gray-200'
} as const;

export class ProjectValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ProjectValidationError';
  }
}

export class ProjectStatusTransitionError extends Error {
  constructor(message: string, public currentStatus: ProjectStatus, public targetStatus: ProjectStatus) {
    super(message);
    this.name = 'ProjectStatusTransitionError';
  }
}

/**
 * Validates if a project status transition is allowed
 */
export function validateStatusTransition(currentStatus: ProjectStatus, newStatus: ProjectStatus): void {
  // Define allowed transitions
  const allowedTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    IN_PROGRESS: [ProjectStatus.COMPLETE],
    COMPLETE: [ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED],
    APPROVED: [ProjectStatus.COMPLETE, ProjectStatus.FINISHED],
    FINISHED: [] // No transitions allowed from finished
  };

  const allowed = allowedTransitions[currentStatus] || [];
  
  if (!allowed.includes(newStatus)) {
    throw new ProjectStatusTransitionError(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
      currentStatus,
      newStatus
    );
  }
}

/**
 * Validates project data
 */
export function validateProjectData(data: { name?: string; description?: string; status?: string }): void {
  if (data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      throw new ProjectValidationError('Project name is required', 'name');
    }
    if (data.name.length > 100) {
      throw new ProjectValidationError('Project name must be 100 characters or less', 'name');
    }
  }

  if (data.description !== undefined && data.description && data.description.length > 500) {
    throw new ProjectValidationError('Project description must be 500 characters or less', 'description');
  }

  if (data.status !== undefined && !isValidProjectStatus(data.status)) {
    throw new ProjectValidationError(
      `Invalid project status. Must be one of: ${Object.values(ProjectStatus).join(', ')}`,
      'status'
    );
  }
}

/**
 * Type guard to check if a string is a valid ProjectStatus
 */
export function isValidProjectStatus(status: string): status is ProjectStatus {
  return Object.values(ProjectStatus).includes(status as ProjectStatus);
}

/**
 * Checks if a project can be moved to finished status
 */
export function canMoveToFinished(status: ProjectStatus): boolean {
  return status === ProjectStatus.APPROVED;
}

/**
 * Filters projects based on their active/finished state
 */
export function isActiveProject(status: ProjectStatus): boolean {
  return status !== ProjectStatus.FINISHED;
}

/**
 * Gets the next logical status for a project
 */
export function getNextStatus(currentStatus: ProjectStatus): ProjectStatus | null {
  switch (currentStatus) {
    case ProjectStatus.IN_PROGRESS:
      return ProjectStatus.COMPLETE;
    case ProjectStatus.COMPLETE:
      return ProjectStatus.APPROVED;
    case ProjectStatus.APPROVED:
      return ProjectStatus.FINISHED;
    default:
      return null;
  }
}

/**
 * Formats status for display
 */
export function formatStatus(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status] || status;
}

/**
 * Gets appropriate CSS classes for status badge
 */
export function getStatusBadgeClasses(status: ProjectStatus): string {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
  const colorClasses = PROJECT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return `${baseClasses} ${colorClasses}`;
}