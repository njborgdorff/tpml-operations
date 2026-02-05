'use client'

import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@/types'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

const statusConfig = {
  [ProjectStatus.IN_PROGRESS]: {
    label: 'In Progress',
    variant: 'info' as const
  },
  [ProjectStatus.COMPLETE]: {
    label: 'Complete',
    variant: 'warning' as const
  },
  [ProjectStatus.APPROVED]: {
    label: 'Approved',
    variant: 'success' as const
  },
  [ProjectStatus.FINISHED]: {
    label: 'Finished',
    variant: 'secondary' as const
  }
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}