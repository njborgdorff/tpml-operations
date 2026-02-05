import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@prisma/client'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

const statusConfig = {
  [ProjectStatus.IN_PROGRESS]: {
    label: 'In Progress',
    variant: 'info' as const,
  },
  [ProjectStatus.COMPLETE]: {
    label: 'Complete',
    variant: 'success' as const,
  },
  [ProjectStatus.APPROVED]: {
    label: 'Approved',
    variant: 'default' as const,
  },
  [ProjectStatus.FINISHED]: {
    label: 'Finished',
    variant: 'secondary' as const,
  },
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}