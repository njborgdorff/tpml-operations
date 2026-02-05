'use client';

import { Badge } from '@/components/ui/badge';
import { ProjectStatus } from '@/lib/types';
import { getStatusColor, getStatusLabel } from '@/lib/utils';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${getStatusColor(status)} ${className}`}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}