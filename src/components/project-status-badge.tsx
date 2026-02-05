'use client'

import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@/lib/types'
import { getStatusColor, getStatusLabel } from '@/lib/utils'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const variant = getStatusColor(status) as any
  const label = getStatusLabel(status)

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}