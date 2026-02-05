import { Project, ProjectStatus, ProjectStatusHistory, User } from '@prisma/client';

export type ProjectWithUser = Project & {
  user: Pick<User, 'id' | 'name' | 'email'>;
  statusHistory?: ProjectStatusHistory[];
};

export type ProjectStatusHistoryWithUser = ProjectStatusHistory & {
  user: Pick<User, 'id' | 'name' | 'email'>;
};

export interface ProjectFilters {
  status?: ProjectStatus;
  filter?: 'active' | 'finished';
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectStatusData {
  status: ProjectStatus;
}

export { ProjectStatus } from '@prisma/client';