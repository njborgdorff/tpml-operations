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
  archivedAt?: Date
  userId: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name?: string
    email: string
  }
  statusHistory?: ProjectStatusHistory[]
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

export interface ProjectFilters {
  status?: ProjectStatus[]
  showArchived?: boolean
}