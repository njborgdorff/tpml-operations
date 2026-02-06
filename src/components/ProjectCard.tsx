'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog'
import { Project, ProjectStatus } from '@/types/project'
import { formatDate } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
  onStatusUpdate: (projectId: string, status: ProjectStatus) => Promise<void>
  isUpdating?: boolean
  readOnly?: boolean
  className?: string
}

// Actions available for each status
function getAvailableActions(status: ProjectStatus): { label: string; status: ProjectStatus }[] {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return [{ label: 'Mark as Complete', status: ProjectStatus.COMPLETE }]
    case ProjectStatus.COMPLETE:
      return [
        { label: 'Mark as In Progress', status: ProjectStatus.IN_PROGRESS },
        { label: 'Mark as Approved', status: ProjectStatus.APPROVED },
      ]
    case ProjectStatus.APPROVED:
      return [
        { label: 'Mark as Complete', status: ProjectStatus.COMPLETE },
        { label: 'Move to Finished', status: ProjectStatus.FINISHED },
      ]
    default:
      return []
  }
}

export function ProjectCard({ project, onStatusUpdate, isUpdating: externalUpdating, readOnly, className }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const updating = externalUpdating || isUpdating

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
    }

    if (showActions) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActions])

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === ProjectStatus.FINISHED) {
      setShowActions(false)
      setShowArchiveDialog(true)
      return
    }
    setIsUpdating(true)
    setShowActions(false)
    setUpdateError(null)
    try {
      await onStatusUpdate(project.id, newStatus)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status'
      setUpdateError(message)
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleArchiveConfirm = async () => {
    setArchiveLoading(true)
    setUpdateError(null)
    try {
      await onStatusUpdate(project.id, ProjectStatus.FINISHED)
      setShowArchiveDialog(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status'
      setUpdateError(message)
      console.error('Failed to update status:', error)
    } finally {
      setArchiveLoading(false)
    }
  }

  const actions = getAvailableActions(project.status)
  const ownerName = project.owner?.name || project.owner?.email || null

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {project.description || 'No description provided'}
            </p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          {ownerName && <p>{ownerName}</p>}
          <p>Created {formatDate(project.createdAt)}</p>
          {project.archivedAt && (
            <p>Archived {formatDate(project.archivedAt)}</p>
          )}
        </div>
      </CardContent>

      {updateError && (
        <CardContent className="pt-0 pb-2">
          <p className="text-sm text-destructive">{updateError}</p>
        </CardContent>
      )}

      {!readOnly && actions.length > 0 && (
        <CardFooter>
          <div className="relative" ref={menuRef}>
            {updating ? (
              <span className="text-sm text-muted-foreground">Updating...</span>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                  disabled={updating}
                  aria-expanded={showActions}
                  aria-haspopup="menu"
                >
                  Actions
                </Button>
                {showActions && (
                  <div
                    role="menu"
                    className="absolute bottom-full left-0 mb-1 w-48 rounded-md border bg-popover p-1 shadow-md z-50"
                  >
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        role="menuitem"
                        onClick={() => handleStatusChange(action.status)}
                        className="w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </CardFooter>
      )}

      <ArchiveConfirmDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        projectName={project.name}
        onConfirm={handleArchiveConfirm}
        isLoading={archiveLoading}
      />
    </Card>
  )
}
