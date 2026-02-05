import { ProjectStatus } from '@prisma/client';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  statusHistory?: ProjectStatusHistoryItem[];
}

export interface ProjectStatusHistoryItem {
  id: string;
  projectId: string;
  oldStatus: ProjectStatus | null;
  newStatus: ProjectStatus;
  changedAt: Date;
  changedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ProjectFilter {
  active: 'active';
  finished: 'finished';
  all: 'all';
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  APPROVED: 'Approved',
  FINISHED: 'Finished'
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  FINISHED: 'bg-gray-100 text-gray-800'
};