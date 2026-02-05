'use client';

import { ProjectStatus, PROJECT_STATUS_LABELS } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectStatusSelectProps {
  value: ProjectStatus;
  onValueChange: (value: ProjectStatus) => void;
  disabled?: boolean;
  className?: string;
}

export function ProjectStatusSelect({ 
  value, 
  onValueChange, 
  disabled = false, 
  className 
}: ProjectStatusSelectProps) {
  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue>
          {PROJECT_STATUS_LABELS[value]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => (
          <SelectItem key={status} value={status}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}