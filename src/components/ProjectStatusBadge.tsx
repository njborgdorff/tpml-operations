import React from 'react'
import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@/types/project'
import { cn } from '@/lib/utils'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

const statusConfig = {
  [ProjectStatus.IN_PROGRESS]: {
    label: 'In Progress',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  [ProjectStatus.COMPLETE]: {
    label: 'Complete',
    variant: 'outline' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  [ProjectStatus.APPROVED]: {
    label: 'Approved',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  [ProjectStatus.FINISHED]: {
    label: 'Finished',
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}