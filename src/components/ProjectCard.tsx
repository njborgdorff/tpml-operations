'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProjectStatus } from '@prisma/client'
import { formatDate } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description?: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  user: {
    id: string
    name?: string | null
    email: string
  }
  statusHistory?: Array<{
    id: string
    oldStatus?: ProjectStatus | null
    newStatus: ProjectStatus
    changedAt: string
    user: {
      id: string
      name?: string | null
      email: string
    }
  }>
}

interface ProjectCardProps {
  project: Project
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => void
}

const statusConfig = {
  [ProjectStatus.IN_PROGRESS]: {
    label: 'In Progress',
    variant: 'info' as const,
    nextActions: [ProjectStatus.COMPLETE]
  },
  [ProjectStatus.COMPLETE]: {
    label: 'Complete',
    variant: 'warning' as const,
    nextActions: [ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS]
  },
  [ProjectStatus.APPROVED]: {
    label: 'Approved',
    variant: 'success' as const,
    nextActions: [ProjectStatus.FINISHED]
  },
  [ProjectStatus.FINISHED]: {
    label: 'Finished',
    variant: 'secondary' as const,
    nextActions: []
  }
}

export function ProjectCard({ project, onStatusChange }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const statusInfo = statusConfig[project.status]

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!onStatusChange) return
    
    setIsUpdating(true)
    try {
      await onStatusChange(project.id, newStatus)
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getActionLabel = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETE:
        return 'Mark Complete'
      case ProjectStatus.APPROVED:
        return 'Mark Approved'
      case ProjectStatus.FINISHED:
        return 'Move to Finished'
      case ProjectStatus.IN_PROGRESS:
        return 'Mark In Progress'
      default:
        return `Update to ${statusInfo.label}`
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-1">
                {project.description}
              </CardDescription>
            )}
          </div>
          <Badge variant={statusInfo.variant} className="ml-2 flex-shrink-0">
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            <div>Created: {formatDate(project.createdAt)}</div>
            <div>Updated: {formatDate(project.updatedAt)}</div>
            {project.archivedAt && (
              <div>Archived: {formatDate(project.archivedAt)}</div>
            )}
          </div>
          
          {statusInfo.nextActions.length > 0 && onStatusChange && (
            <div className="flex flex-wrap gap-2">
              {statusInfo.nextActions.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={isUpdating}
                >
                  {getActionLabel(nextStatus)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}