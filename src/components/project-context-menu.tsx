'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal,
  Edit,
  Archive,
  Trash2,
  CheckCircle,
  Circle,
  Clock
} from 'lucide-react'
import { ArchiveConfirmationDialog } from './archive-confirmation-dialog'
import { useToast } from '@/hooks/use-toast'
import { Project, ProjectStatus } from '@/types/project'

interface ProjectContextMenuProps {
  project: Project
  onStatusChange?: (projectId: string, newStatus: string) => void
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
  onRefresh?: () => void
}

export function ProjectContextMenu({
  project,
  onStatusChange,
  onEdit,
  onDelete,
  onRefresh
}: ProjectContextMenuProps) {
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const { toast } = useToast()

  const canArchive = project.status === 'APPROVED'
  const isFinished = project.status === 'FINISHED'

  const handleStatusChange = (newStatus: string) => {
    onStatusChange?.(project.id, newStatus)
  }

  const handleArchive = async () => {
    setIsArchiving(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to archive project')
      }

      toast({
        title: 'Project Archived',
        description: `"${project.name}" has been moved to Finished.`,
      })

      onRefresh?.()
    } catch (error) {
      // Re-throw to let dialog handle it
      throw error
    } finally {
      setIsArchiving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />
      case 'COMPLETE':
        return <Circle className="h-4 w-4" />
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (isFinished) {
    // Read-only menu for finished projects
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>
            <Archive className="h-4 w-4 mr-2" />
            Archived Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </DropdownMenuItem>
          )}
          
          {onStatusChange && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={project.status === 'IN_PROGRESS'}
              >
                {getStatusIcon('IN_PROGRESS')}
                <span className="ml-2">Mark as In Progress</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusChange('COMPLETE')}
                disabled={project.status === 'COMPLETE'}
              >
                {getStatusIcon('COMPLETE')}
                <span className="ml-2">Mark as Complete</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusChange('APPROVED')}
                disabled={project.status === 'APPROVED'}
              >
                {getStatusIcon('APPROVED')}
                <span className="ml-2">Mark as Approved</span>
              </DropdownMenuItem>
            </>
          )}

          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsArchiveDialogOpen(true)}
                className="text-orange-600"
              >
                <Archive className="h-4 w-4 mr-2" />
                Move to Finished
              </DropdownMenuItem>
            </>
          )}

          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(project.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ArchiveConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={handleArchive}
        project={project}
        isLoading={isArchiving}
      />
    </>
  )
}