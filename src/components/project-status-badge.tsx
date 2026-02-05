"use client"

import { Badge } from "@/components/ui/badge"
import { ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/types/project"
import { cn } from "@/lib/utils"

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "border font-medium",
        PROJECT_STATUS_COLORS[status],
        className
      )}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}