import { Badge } from "@/components/ui/badge"
import { ProjectStatus, PROJECT_STATUS_LABELS } from "@/types/project"

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const getVariant = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return "info"
      case ProjectStatus.COMPLETE:
        return "warning"
      case ProjectStatus.APPROVED:
        return "success"
      case ProjectStatus.ARCHIVED:
        return "muted"
      default:
        return "default"
    }
  }

  return (
    <Badge variant={getVariant(status)} className={className}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}