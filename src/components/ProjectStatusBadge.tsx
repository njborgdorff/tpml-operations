import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@prisma/client'
import { formatStatus } from '@/lib/project-utils'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

const statusVariants: Record<string, BadgeVariant> = {
  [ProjectStatus.INTAKE]: 'default',
  [ProjectStatus.PLANNING]: 'default',
  [ProjectStatus.REVIEW]: 'warning',
  [ProjectStatus.APPROVED]: 'success',
  [ProjectStatus.IN_PROGRESS]: 'info',
  [ProjectStatus.ACTIVE]: 'info',
  [ProjectStatus.COMPLETE]: 'warning',
  [ProjectStatus.COMPLETED]: 'success',
  [ProjectStatus.FINISHED]: 'secondary',
  [ProjectStatus.CANCELLED]: 'destructive',
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const variant = statusVariants[status] || 'secondary'

  return (
    <Badge variant={variant} className={className}>
      {formatStatus(status)}
    </Badge>
  )
}
