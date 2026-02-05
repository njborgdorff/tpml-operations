"use client"

import { ProjectStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

const statusConfig: Record<ProjectStatus, { label: string; variant: any }> = {
  IN_PROGRESS: { 
    label: "In Progress", 
    variant: "info" 
  },
  COMPLETE: { 
    label: "Complete", 
    variant: "warning" 
  },
  APPROVED: { 
    label: "Approved", 
    variant: "success" 
  },
  FINISHED: { 
    label: "Finished", 
    variant: "secondary" 
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