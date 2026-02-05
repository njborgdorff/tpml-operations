'use client';

import { useState } from 'react';
import { Project, ProjectStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectStatusSelect } from './ProjectStatusSelect';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  project: Project;
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => void;
  onStatusChangeLoading?: boolean;
  currentUserId?: string;
}

export function ProjectCard({ 
  project, 
  onStatusChange, 
  onStatusChangeLoading = false,
  currentUserId = 'temp-user' // TODO: Replace with actual user ID from auth
}: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>(project.status as ProjectStatus);

  const handleStatusChange = async () => {
    if (onStatusChange && selectedStatus !== project.status) {
      await onStatusChange(project.id, selectedStatus);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedStatus(project.status as ProjectStatus);
    setIsEditing(false);
  };

  const latestHistory = project.statusHistory?.[0];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-1">
                {project.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <ProjectStatusBadge status={project.status as ProjectStatus} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs"
                >
                  Edit
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <ProjectStatusSelect
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                  disabled={onStatusChangeLoading}
                  className="w-32"
                />
                <Button
                  size="sm"
                  onClick={handleStatusChange}
                  disabled={onStatusChangeLoading}
                  className="text-xs"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={onStatusChangeLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{formatDate(project.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Updated:</span>
            <span>{formatDate(project.updatedAt)}</span>
          </div>
          {project.archivedAt && (
            <div className="flex justify-between">
              <span>Archived:</span>
              <span>{formatDate(project.archivedAt)}</span>
            </div>
          )}
          {latestHistory && (
            <div className="flex justify-between">
              <span>Status Changed:</span>
              <span>{formatDateTime(latestHistory.changedAt)}</span>
            </div>
          )}
          {project.user && (
            <div className="flex justify-between">
              <span>Owner:</span>
              <span>{project.user.name || project.user.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}