import { ProjectStatus } from "@prisma/client"

export { ProjectStatus }

export interface User {
  id: string
  name: string | null
  email: string
}

export interface ProjectStatusHistory {
  id: string
  projectId: string
  oldStatus: ProjectStatus | null
  newStatus: ProjectStatus
  changedAt: Date
  changedBy: string
  user: User
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  userId: string
  user: User
  statusHistory: ProjectStatusHistory[]
}

export type ProjectFilter = 'ALL' | 'ACTIVE' | 'FINISHED' | 'IN_PROGRESS' | 'COMPLETE' | 'APPROVED'

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