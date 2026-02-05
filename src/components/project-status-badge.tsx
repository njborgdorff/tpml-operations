'use client'

import { ProjectStatus } from '@/lib/types'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { Badge } from './ui/badge'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`${getStatusColor(status)} ${className || ''}`}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}