import { ProjectStatus } from '@prisma/client';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.COMPLETE]: 'Complete',
  [ProjectStatus.APPROVED]: 'Approved',
  [ProjectStatus.FINISHED]: 'Finished'
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ProjectStatus.COMPLETE]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ProjectStatus.APPROVED]: 'bg-green-100 text-green-800 border-green-200',
  [ProjectStatus.FINISHED]: 'bg-gray-100 text-gray-800 border-gray-200'
};

export function getStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status];
}

export function getStatusColor(status: ProjectStatus): string {
  return PROJECT_STATUS_COLORS[status];
}

export function canMoveToFinished(status: ProjectStatus): boolean {
  return status === ProjectStatus.APPROVED;
}

export function isActiveProject(status: ProjectStatus): boolean {
  return status === ProjectStatus.IN_PROGRESS || status === ProjectStatus.COMPLETE;
}

export function isFinishedProject(status: ProjectStatus): boolean {
  return status === ProjectStatus.FINISHED;
}

export function getNextStatus(currentStatus: ProjectStatus): ProjectStatus | null {
  switch (currentStatus) {
    case ProjectStatus.IN_PROGRESS:
      return ProjectStatus.COMPLETE;
    case ProjectStatus.COMPLETE:
      return ProjectStatus.APPROVED;
    case ProjectStatus.APPROVED:
      return ProjectStatus.FINISHED;
    default:
      return null;
  }
}

export function getPreviousStatus(currentStatus: ProjectStatus): ProjectStatus | null {
  switch (currentStatus) {
    case ProjectStatus.COMPLETE:
      return ProjectStatus.IN_PROGRESS;
    case ProjectStatus.APPROVED:
      return ProjectStatus.COMPLETE;
    default:
      return null;
  }
}