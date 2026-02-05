import { ProjectStatus } from '@prisma/client'

export type { ProjectStatus }

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  userId: string
}

export interface ProjectWithHistory extends Project {
  statusHistory: ProjectStatusHistory[]
}

export interface ProjectStatusHistory {
  id: string
  projectId: string
  oldStatus: ProjectStatus | null
  newStatus: ProjectStatus
  changedAt: Date
  changedBy: string
  user?: {
    name: string | null
    email: string
  }
}

export interface User {
  id: string
  email: string
  name: string | null
  role: string
}

export type ProjectFilter = 'all' | 'active' | 'finished'

export interface StatusUpdateRequest {
  status: ProjectStatus
  userId: string
}