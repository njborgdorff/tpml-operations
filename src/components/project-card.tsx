'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/project-status-badge'
import { Project, ProjectStatus } from '@/types/project'
import { format } from 'date-fns'

interface ProjectCardProps {
  project: Project
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => Promise<void>
}

export function ProjectCard({ project, onStatusChange }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setIsUpdating(true)
    try {
      await onStatusChange(project.id, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const getAvailableStatusTransitions = (currentStatus: ProjectStatus) => {
    switch (currentStatus) {
      case ProjectStatus.IN_PROGRESS:
        return [
          { status: ProjectStatus.COMPLETE, label: 'Mark Complete', variant: 'outline' as const }
        ]
      case ProjectStatus.COMPLETE:
        return [
          { status: ProjectStatus.IN_PROGRESS, label: 'Back to Progress', variant: 'outline' as const },
          { status: ProjectStatus.APPROVED, label: 'Mark Approved', variant: 'default' as const }
        ]
      case ProjectStatus.APPROVED:
        return [
          { status: ProjectStatus.COMPLETE, label: 'Back to Complete', variant: 'outline' as const },
          { status: ProjectStatus.FINISHED, label: 'Move to Finished', variant: 'secondary' as const }
        ]
      case ProjectStatus.FINISHED:
        return [] // No transitions from finished state
      default:
        return []
    }
  }

  const availableTransitions = getAvailableStatusTransitions(project.status)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm text-gray-600">
          <p>Created: {format(new Date(project.createdAt), 'MMM dd, yyyy')}</p>
          <p>Updated: {format(new Date(project.updatedAt), 'MMM dd, yyyy')}</p>
          {project.archivedAt && (
            <p>Archived: {format(new Date(project.archivedAt), 'MMM dd, yyyy')}</p>
          )}
        </div>
      </CardContent>

      {availableTransitions.length > 0 && (
        <CardFooter className="flex gap-2 flex-wrap">
          {availableTransitions.map(({ status, label, variant }) => (
            <Button
              key={status}
              variant={variant}
              size="sm"
              disabled={isUpdating}
              onClick={() => handleStatusChange(status)}
            >
              {isUpdating ? 'Updating...' : label}
            </Button>
          ))}
        </CardFooter>
      )}
    </Card>
  )
}