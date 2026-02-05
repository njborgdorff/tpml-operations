import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@/types/project'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return {
          variant: 'info' as const,
          text: 'In Progress'
        }
      case ProjectStatus.COMPLETE:
        return {
          variant: 'warning' as const,
          text: 'Complete'
        }
      case ProjectStatus.APPROVED:
        return {
          variant: 'success' as const,
          text: 'Approved'
        }
      case ProjectStatus.FINISHED:
        return {
          variant: 'secondary' as const,
          text: 'Finished'
        }
      default:
        return {
          variant: 'default' as const,
          text: 'Unknown'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant}>
      {config.text}
    </Badge>
  )
}