'use client';

import { Project, ProjectStatus } from '@/types/project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectStatusSelector } from '@/components/project-status-selector';

interface ProjectCardProps {
  project: Project;
  onStatusUpdate: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
}

export function ProjectCard({ project, onStatusUpdate }: ProjectCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Created: {formatDate(project.createdAt)}</div>
          <div>Updated: {formatDate(project.updatedAt)}</div>
          {project.archivedAt && (
            <div>Archived: {formatDate(project.archivedAt)}</div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <ProjectStatusSelector
          currentStatus={project.status}
          projectId={project.id}
          onStatusUpdate={onStatusUpdate}
        />
      </CardFooter>
    </Card>
  );
}