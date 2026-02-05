'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/ProjectStatusBadge'
import { Project, ProjectStatus } from '@/types/project'
import { formatDistanceToNow } from 'date-fns'

interface ProjectCardProps {
  project: Project
  onStatusUpdate: (projectId: string, newStatus: ProjectStatus) => void
  currentUserId: string
}

export function ProjectCard({ project, onStatusUpdate, currentUserId }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusUpdate = async (newStatus: ProjectStatus) => {
    if (project.userId !== currentUserId) return
    
    setIsUpdating(true)
    try {
      await onStatusUpdate(project.id, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const getNextStatus = () => {
    switch (project.status) {
      case ProjectStatus.IN_PROGRESS:
        return { status: ProjectStatus.COMPLETE, label: 'Mark Complete' }
      case ProjectStatus.COMPLETE:
        return { status: ProjectStatus.APPROVED, label: 'Mark Approved' }
      case ProjectStatus.APPROVED:
        return { status: ProjectStatus.FINISHED, label: 'Move to Finished' }
      default:
        return null
    }
  }

  const nextAction = getNextStatus()
  const isOwner = project.userId === currentUserId
  const canUpdate = isOwner && nextAction && project.status !== ProjectStatus.FINISHED

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.description && (
          <CardDescription>{project.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Created {formatDistanceToNow(new Date(project.createdAt))} ago</div>
          <div>Last updated {formatDistanceToNow(new Date(project.updatedAt))} ago</div>
          {project.archivedAt && (
            <div>Archived {formatDistanceToNow(new Date(project.archivedAt))} ago</div>
          )}
          {project.user && (
            <div>Owner: {project.user.name || project.user.email}</div>
          )}
        </div>
      </CardContent>
      {canUpdate && (
        <CardFooter>
          <Button 
            onClick={() => handleStatusUpdate(nextAction.status)}
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Updating...' : nextAction.label}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}