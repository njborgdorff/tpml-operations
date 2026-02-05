export enum ProjectStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  APPROVED = 'APPROVED',
  FINISHED = 'FINISHED'
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  userId: string;
  user?: User;
  statusHistory?: ProjectStatusHistory[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectStatusHistory {
  id: string;
  projectId: string;
  oldStatus?: ProjectStatus;
  newStatus: ProjectStatus;
  changedAt: Date;
  changedBy: string;
  user?: User;
}

export interface ProjectFilter {
  status?: ProjectStatus | 'ACTIVE' | 'FINISHED';
  userId?: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.COMPLETE]: 'Complete',
  [ProjectStatus.APPROVED]: 'Approved',
  [ProjectStatus.FINISHED]: 'Finished'
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [ProjectStatus.COMPLETE]: 'bg-yellow-100 text-yellow-800',
  [ProjectStatus.APPROVED]: 'bg-green-100 text-green-800',
  [ProjectStatus.FINISHED]: 'bg-gray-100 text-gray-800'
};