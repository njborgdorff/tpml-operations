import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@prisma/client'
import { formatStatus } from '@/lib/project-utils'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

const statusConfig: Record<string, { variant: BadgeVariant }> = {
  [ProjectStatus.INTAKE]: { variant: 'default' },
  [ProjectStatus.PLANNING]: { variant: 'default' },
  [ProjectStatus.REVIEW]: { variant: 'warning' },
  [ProjectStatus.APPROVED]: { variant: 'success' },
  [ProjectStatus.IN_PROGRESS]: { variant: 'info' },
  [ProjectStatus.ACTIVE]: { variant: 'info' },
  [ProjectStatus.COMPLETE]: { variant: 'warning' },
  [ProjectStatus.COMPLETED]: { variant: 'success' },
  [ProjectStatus.FINISHED]: { variant: 'secondary' },
  [ProjectStatus.CANCELLED]: { variant: 'destructive' },
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status] || { variant: 'secondary' as const }

  return (
    <Badge variant={config.variant}>
      {formatStatus(status)}
    </Badge>
  )
}
