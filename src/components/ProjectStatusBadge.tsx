'use client'

import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@/lib/types'
import { formatProjectStatus, getStatusVariant } from '@/lib/utils'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const variant = getStatusVariant(status) as any
  const label = formatProjectStatus(status)

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}