'use client';

import { Badge } from '@/components/ui/badge';
import { ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/types';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`${PROJECT_STATUS_COLORS[status]} border-transparent ${className}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}