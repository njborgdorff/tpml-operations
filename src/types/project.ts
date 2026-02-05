export enum ProjectStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  APPROVED = 'APPROVED',
  FINISHED = 'FINISHED'
}

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  userId: string
  createdAt: Date
  updatedAt: Date
  archivedAt?: Date
  user?: {
    id: string
    name?: string
    email: string
  }
}

export interface ProjectStatusHistory {
  id: string
  projectId: string
  oldStatus?: ProjectStatus
  newStatus: ProjectStatus
  changedBy: string
  changedAt: Date
  user: {
    id: string
    name?: string
    email: string
  }
}

export interface ProjectWithHistory extends Project {
  statusHistory: ProjectStatusHistory[]
}

export type ProjectFilter = 'all' | 'active' | 'finished'

export interface UpdateProjectStatusRequest {
  status: ProjectStatus
}

export interface CreateProjectRequest {
  name: string
  description?: string
}