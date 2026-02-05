export enum ProjectStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  APPROVED = 'APPROVED',
  FINISHED = 'FINISHED'
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
  user?: {
    id: string
    name: string | null
    email: string
  }
  statusHistory?: ProjectStatusHistory[]
}

export interface ProjectStatusHistory {
  id: string
  projectId: string
  oldStatus: ProjectStatus | null
  newStatus: ProjectStatus
  changedAt: Date
  changedBy: string
  user?: {
    id: string
    name: string | null
    email: string
  }
}

export interface ProjectFilter {
  status?: ProjectStatus | ProjectStatus[]
  userId?: string
  includeFinished?: boolean
}

export const PROJECT_STATUS_LABELS = {
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.COMPLETE]: 'Complete',
  [ProjectStatus.APPROVED]: 'Approved',
  [ProjectStatus.FINISHED]: 'Finished'
} as const

export const PROJECT_STATUS_COLORS = {
  [ProjectStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ProjectStatus.COMPLETE]: 'bg-green-100 text-green-800 border-green-200',
  [ProjectStatus.APPROVED]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ProjectStatus.FINISHED]: 'bg-gray-100 text-gray-800 border-gray-200'
} as const