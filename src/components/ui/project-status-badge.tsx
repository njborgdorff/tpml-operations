import { ProjectStatus } from '@prisma/client';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project';
import { Badge } from '@/components/ui/badge';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge 
      className={`${PROJECT_STATUS_COLORS[status]} ${className || ''}`}
      variant="secondary"
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}