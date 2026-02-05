'use client';

import { useState } from 'react';
import { ProjectStatus } from '@/types/project';
import { Button } from '@/components/ui/button';

interface ProjectStatusSelectorProps {
  currentStatus: ProjectStatus;
  projectId: string;
  onStatusUpdate: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
}

export function ProjectStatusSelector({ 
  currentStatus, 
  projectId, 
  onStatusUpdate 
}: ProjectStatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const getNextStatus = (current: ProjectStatus): ProjectStatus | null => {
    switch (current) {
      case ProjectStatus.IN_PROGRESS:
        return ProjectStatus.COMPLETE;
      case ProjectStatus.COMPLETE:
        return ProjectStatus.APPROVED;
      case ProjectStatus.APPROVED:
        return ProjectStatus.FINISHED;
      case ProjectStatus.FINISHED:
        return null; // No further status
      default:
        return null;
    }
  };

  const getStatusActionLabel = (current: ProjectStatus): string => {
    switch (current) {
      case ProjectStatus.IN_PROGRESS:
        return "Mark Complete";
      case ProjectStatus.COMPLETE:
        return "Mark Approved";
      case ProjectStatus.APPROVED:
        return "Move to Finished";
      case ProjectStatus.FINISHED:
        return "Already Finished";
      default:
        return "Update Status";
    }
  };

  const handleStatusUpdate = async () => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(projectId, nextStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const nextStatus = getNextStatus(currentStatus);
  
  if (!nextStatus) {
    return (
      <Button variant="secondary" disabled size="sm">
        {getStatusActionLabel(currentStatus)}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleStatusUpdate}
      disabled={isUpdating}
      size="sm"
      variant={currentStatus === ProjectStatus.APPROVED ? "destructive" : "default"}
    >
      {isUpdating ? "Updating..." : getStatusActionLabel(currentStatus)}
    </Button>
  );
}