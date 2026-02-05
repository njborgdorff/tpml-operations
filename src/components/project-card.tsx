import React from 'react';
import { ProjectWithUser } from '@/lib/types';
import { ProjectStatus } from '@prisma/client';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateProjectStatus } from '@/hooks/use-projects';
import { getStatusLabel, getNextStatus, getPreviousStatus, canMoveToFinished } from '@/lib/project-utils';
import { MoreHorizontal, Clock, CheckCircle, Award, Archive, History } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectWithUser;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const updateStatusMutation = useUpdateProjectStatus();

  const handleStatusUpdate = (newStatus: ProjectStatus) => {
    updateStatusMutation.mutate({ id: project.id, status: newStatus });
  };

  const nextStatus = getNextStatus(project.status);
  const previousStatus = getPreviousStatus(project.status);

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4" />;
      case ProjectStatus.COMPLETE:
        return <CheckCircle className="h-4 w-4" />;
      case ProjectStatus.APPROVED:
        return <Award className="h-4 w-4" />;
      case ProjectStatus.FINISHED:
        return <Archive className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="border rounded-lg p-4 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{project.name}</h3>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>Created: {formatDate(project.createdAt)}</span>
            <span>Updated: {formatDate(project.updatedAt)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <ProjectStatusBadge status={project.status} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Status Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {previousStatus && (
                <DropdownMenuItem 
                  onClick={() => handleStatusUpdate(previousStatus)}
                  disabled={updateStatusMutation.isPending}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(previousStatus)}
                    Mark as {getStatusLabel(previousStatus)}
                  </div>
                </DropdownMenuItem>
              )}
              
              {nextStatus && (
                <DropdownMenuItem 
                  onClick={() => handleStatusUpdate(nextStatus)}
                  disabled={updateStatusMutation.isPending}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(nextStatus)}
                    Mark as {getStatusLabel(nextStatus)}
                  </div>
                </DropdownMenuItem>
              )}
              
              {canMoveToFinished(project.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleStatusUpdate(ProjectStatus.FINISHED)}
                    disabled={updateStatusMutation.isPending}
                    className="text-orange-700 focus:text-orange-700 focus:bg-orange-50"
                  >
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      Move to Finished
                    </div>
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Project Info</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Status History Available
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Status transition hint */}
      {project.status !== ProjectStatus.FINISHED && (
        <div className="mt-3 text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1">
          <span className="font-medium">Next:</span> {nextStatus ? getStatusLabel(nextStatus) : 'Complete'}
        </div>
      )}
      
      {updateStatusMutation.isPending && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
          Updating status...
        </div>
      )}
    </div>
  );
}