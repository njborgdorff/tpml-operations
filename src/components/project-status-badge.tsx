import React from 'react';
import { ProjectStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusColor } from '@/lib/project-utils';
import { cn } from '@/lib/utils';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        getStatusColor(status),
        className
      )}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}