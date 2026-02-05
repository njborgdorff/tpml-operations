import { ProjectStatus } from '@prisma/client';
import { getStatusBadgeClasses, formatStatus } from '@/lib/project-utils';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`${getStatusBadgeClasses(status)} ${className}`}>
      {formatStatus(status)}
    </span>
  );
}