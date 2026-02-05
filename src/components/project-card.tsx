'use client';

import { Project, ProjectStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectStatusSelector } from '@/components/project-status-selector';

interface ProjectCardProps {
  project: Project;
  onStatusUpdate: (projectId: string, status: ProjectStatus) => Promise<void>;
  readOnly?: boolean;
}

export function ProjectCard({ project, onStatusUpdate, readOnly = false }: ProjectCardProps) {
  const handleStatusChange = async (status: ProjectStatus) => {
    await onStatusUpdate(project.id, status);
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-1">
                {project.description}
              </CardDescription>
            )}
          </div>
          <div className="ml-4 flex flex-col items-end gap-2">
            {readOnly ? (
              <ProjectStatusBadge status={project.status} />
            ) : (
              <ProjectStatusSelector
                currentStatus={project.status}
                projectId={project.id}
                onStatusChange={handleStatusChange}
                disabled={project.status === ProjectStatus.FINISHED}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Created: {formatDate(project.createdAt)}</span>
          <span>Updated: {formatDate(project.updatedAt)}</span>
          {project.archivedAt && (
            <span>Archived: {formatDate(project.archivedAt)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}