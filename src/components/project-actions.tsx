import { MoreHorizontal, CheckCircle, Clock, Archive, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectStatus } from '@prisma/client'

interface ProjectActionsProps {
  project: {
    id: string
    status: ProjectStatus
  }
  onStatusChange?: (projectId: string, status: ProjectStatus) => void
}

export function ProjectActions({ project, onStatusChange }: ProjectActionsProps) {
  const handleStatusChange = (newStatus: ProjectStatus) => {
    onStatusChange?.(project.id, newStatus)
  }

  const getAvailableActions = (currentStatus: ProjectStatus) => {
    switch (currentStatus) {
      case ProjectStatus.IN_PROGRESS:
        return [
          {
            label: 'Mark as Complete',
            icon: CheckCircle,
            action: () => handleStatusChange(ProjectStatus.COMPLETE),
          },
        ]
      case ProjectStatus.COMPLETE:
        return [
          {
            label: 'Mark as In Progress',
            icon: Clock,
            action: () => handleStatusChange(ProjectStatus.IN_PROGRESS),
          },
          {
            label: 'Mark as Approved',
            icon: ArrowRight,
            action: () => handleStatusChange(ProjectStatus.APPROVED),
          },
        ]
      case ProjectStatus.APPROVED:
        return [
          {
            label: 'Mark as Complete',
            icon: CheckCircle,
            action: () => handleStatusChange(ProjectStatus.COMPLETE),
          },
          {
            label: 'Move to Finished',
            icon: Archive,
            action: () => handleStatusChange(ProjectStatus.FINISHED),
          },
        ]
      case ProjectStatus.FINISHED:
        return [] // No actions available for finished projects
      default:
        return []
    }
  }

  const actions = getAvailableActions(project.status)

  if (actions.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action, index) => {
          const IconComponent = action.icon
          return (
            <DropdownMenuItem key={index} onClick={action.action}>
              <IconComponent className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}