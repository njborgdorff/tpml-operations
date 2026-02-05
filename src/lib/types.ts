export type ProjectStatus = 'IN_PROGRESS' | 'COMPLETE' | 'APPROVED' | 'FINISHED';

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
    email: string;
    name?: string;
  };
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

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectStatusData {
  status: ProjectStatus;
}