import { Badge } from '@/components/ui/badge';
import { ProjectStatus } from '@/lib/types';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

const statusConfig = {
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'info' as const,
  },
  COMPLETE: {
    label: 'Complete',
    variant: 'warning' as const,
  },
  APPROVED: {
    label: 'Approved',
    variant: 'success' as const,
  },
  FINISHED: {
    label: 'Finished',
    variant: 'secondary' as const,
  },
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}