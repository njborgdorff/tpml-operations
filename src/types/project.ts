export type ProjectStatus = 'IN_PROGRESS' | 'COMPLETE' | 'APPROVED' | 'FINISHED'

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
  changedAt: string
  changedBy: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  userId: string
  user: User
  statusHistory?: ProjectStatusHistory[]
}

export interface CreateProjectData {
  name: string
  description?: string
}

export interface UpdateProjectStatusData {
  status: ProjectStatus
}