import { ProjectStatus } from '@prisma/client'

export { ProjectStatus }

export interface ProjectUser {
  id: string
  name?: string | null
  email: string
}

export interface Project {
  id: string
  name: string
  slug: string
  description?: string | null
  status: ProjectStatus
  archivedAt?: Date | string | null
  ownerId: string
  clientId: string
  createdAt: Date | string
  updatedAt: Date | string
  client?: {
    id: string
    name: string
    slug: string
  }
  owner?: ProjectUser
  statusHistory?: ProjectStatusHistory[]
}

export interface ProjectStatusHistory {
  id: string
  projectId: string
  oldStatus?: ProjectStatus | null
  newStatus: ProjectStatus
  changedBy: string
  changedAt: Date | string
  user?: ProjectUser
}

export interface ProjectFilters {
  filter?: 'active' | 'finished' | 'all'
  status?: ProjectStatus[]
}
