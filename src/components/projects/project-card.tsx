'use client';

import { useState } from 'react';
import { ProjectStatus } from '@prisma/client';
import { Project } from '@/types/project';
import { ProjectStatusBadge } from '@/components/ui/project-status-badge';
import { Button } from '@/components/ui/button';
import { useUpdateProjectStatus } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Clock, CheckCircle, Award } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  showStatusActions?: boolean;
}

export function ProjectCard({ project, showStatusActions = true }: ProjectCardProps) {
  const updateStatusMutation = useUpdateProjectStatus();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        projectId: project.id,
        status: newStatus
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4" />;
      case ProjectStatus.COMPLETE:
        return <CheckCircle className="h-4 w-4" />;
      case ProjectStatus.APPROVED:
        return <Award className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getAvailableStatusTransitions = (currentStatus: ProjectStatus): ProjectStatus[] => {
    switch (currentStatus) {
      case ProjectStatus.IN_PROGRESS:
        return [ProjectStatus.COMPLETE];
      case ProjectStatus.COMPLETE:
        return [ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED];
      case ProjectStatus.APPROVED:
        return [ProjectStatus.COMPLETE, ProjectStatus.FINISHED];
      case ProjectStatus.FINISHED:
        return []; // No transitions from finished
      default:
        return [];
    }
  };

  const availableTransitions = getAvailableStatusTransitions(project.status);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">
            {project.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            {showStatusActions && availableTransitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    disabled={isUpdating}
                    className="h-8 w-8"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableTransitions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="flex items-center gap-2"
                    >
                      {getStatusIcon(status)}
                      Mark as {status.toLowerCase().replace('_', ' ')}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {project.description && (
          <p className="text-sm text-gray-600 mb-3">
            {project.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Created: {new Date(project.createdAt).toLocaleDateString()}
          </span>
          <span>
            Updated: {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {project.archivedAt && (
          <div className="mt-2 text-xs text-gray-500">
            Archived: {new Date(project.archivedAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}