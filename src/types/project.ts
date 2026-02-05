import { Project, ProjectStatus, ProjectStatusHistory, User } from '@prisma/client'

export type { ProjectStatus } from '@prisma/client'

export interface ProjectWithUser extends Project {
  user: User
}

export interface ProjectWithHistory extends Project {
  user: User
  statusHistory: (ProjectStatusHistory & { user: User })[]
}

export interface ProjectStatusChangeRequest {
  projectId: string
  newStatus: ProjectStatus
}

export interface ProjectFilters {
  status?: ProjectStatus | 'ACTIVE' | 'ALL'
  userId?: string
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived'
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800'
}