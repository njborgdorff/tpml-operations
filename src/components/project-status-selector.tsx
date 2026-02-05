'use client';

import { useState } from 'react';
import { ProjectStatus } from '@/lib/types';
import { getStatusLabel } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectStatusSelectorProps {
  currentStatus: ProjectStatus;
  projectId: string;
  onStatusChange: (status: ProjectStatus) => Promise<void>;
  disabled?: boolean;
}

const STATUS_OPTIONS = [
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.COMPLETE,
  ProjectStatus.APPROVED,
];

export function ProjectStatusSelector({
  currentStatus,
  projectId,
  onStatusChange,
  disabled = false,
}: ProjectStatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (value: string) => {
    if (isUpdating) return;
    
    const newStatus = value as ProjectStatus;
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {getStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}