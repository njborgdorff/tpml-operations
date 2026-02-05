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
  user: {
    id: string;
    name?: string;
    email: string;
  };
  history?: ProjectStatusHistory[];
}

export interface ProjectStatusHistory {
  id: string;
  projectId: string;
  oldStatus?: ProjectStatus;
  newStatus: ProjectStatus;
  changedAt: Date;
  changedBy: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export type ProjectFilter = 'all' | 'active' | 'finished';