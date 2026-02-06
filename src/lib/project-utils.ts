import { ProjectStatus } from '@prisma/client'

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  INTAKE: 'Intake',
  PLANNING: 'Planning',
  REVIEW: 'Review',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  ACTIVE: 'Active',
  COMPLETE: 'Complete',
  COMPLETED: 'Completed',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  INTAKE: 'bg-purple-100 text-purple-800 border-purple-200',
  PLANNING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  REVIEW: 'bg-orange-100 text-orange-800 border-orange-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  COMPLETE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  FINISHED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

// Status transitions for the finished project workflow
export const FINISHED_WORKFLOW_TRANSITIONS: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
  [ProjectStatus.IN_PROGRESS]: [ProjectStatus.COMPLETE],
  [ProjectStatus.COMPLETE]: [ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED],
  [ProjectStatus.APPROVED]: [ProjectStatus.COMPLETE, ProjectStatus.FINISHED],
  [ProjectStatus.FINISHED]: [],
}

export class ProjectValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

export class ProjectStatusTransitionError extends Error {
  constructor(message: string, public currentStatus: ProjectStatus, public targetStatus: ProjectStatus) {
    super(message)
    this.name = 'ProjectStatusTransitionError'
  }
}

/**
 * Validates if a project status transition is allowed in the finished project workflow
 */
export function validateStatusTransition(currentStatus: ProjectStatus, newStatus: ProjectStatus): void {
  const allowed = FINISHED_WORKFLOW_TRANSITIONS[currentStatus]

  if (!allowed || !allowed.includes(newStatus)) {
    throw new ProjectStatusTransitionError(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
      currentStatus,
      newStatus
    )
  }
}

/**
 * Validates project data
 */
export function validateProjectData(data: { name?: string; description?: string; status?: string }): void {
  if (data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      throw new ProjectValidationError('Project name is required', 'name')
    }
    if (data.name.length > 100) {
      throw new ProjectValidationError('Project name must be 100 characters or less', 'name')
    }
  }

  if (data.description !== undefined && data.description && data.description.length > 500) {
    throw new ProjectValidationError('Project description must be 500 characters or less', 'description')
  }

  if (data.status !== undefined && !isValidProjectStatus(data.status)) {
    throw new ProjectValidationError(
      `Invalid project status. Must be one of: ${Object.values(ProjectStatus).join(', ')}`,
      'status'
    )
  }
}

/**
 * Type guard to check if a string is a valid ProjectStatus
 */
export function isValidProjectStatus(status: string): status is ProjectStatus {
  return Object.values(ProjectStatus).includes(status as ProjectStatus)
}

/**
 * Checks if a project can be moved to finished status
 */
export function canMoveToFinished(status: ProjectStatus): boolean {
  return status === ProjectStatus.APPROVED
}

/**
 * Filters projects based on their active/finished state
 */
export function isActiveProject(status: ProjectStatus): boolean {
  return status !== ProjectStatus.FINISHED
}

/**
 * Gets the next logical status for a project in the finished project workflow
 */
export function getNextStatus(currentStatus: ProjectStatus): ProjectStatus | null {
  switch (currentStatus) {
    case ProjectStatus.IN_PROGRESS:
      return ProjectStatus.COMPLETE
    case ProjectStatus.COMPLETE:
      return ProjectStatus.APPROVED
    case ProjectStatus.APPROVED:
      return ProjectStatus.FINISHED
    default:
      return null
  }
}

/**
 * Formats status for display
 */
export function formatStatus(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status] || status
}

/**
 * Gets appropriate CSS classes for status badge
 */
export function getStatusBadgeClasses(status: ProjectStatus): string {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
  const colorClasses = PROJECT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  return `${baseClasses} ${colorClasses}`
}
