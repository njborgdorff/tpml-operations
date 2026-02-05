'use client'

import { useState } from 'react'
import { Project, ProjectStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ProjectStatusBadge } from './project-status-badge'
import { ProjectStatusSelect } from './project-status-select'

interface ProjectCardProps {
  project: Project
  onStatusUpdate: (projectId: string, status: ProjectStatus) => Promise<void>
  isUpdating?: boolean
}

export function ProjectCard({ project, onStatusUpdate, isUpdating = false }: ProjectCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setIsLoading(true)
    try {
      await onStatusUpdate(project.id, newStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isFinished = project.status === ProjectStatus.FINISHED

  return (
    <Card className={`transition-all hover:shadow-md ${isFinished ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <div>Created: {formatDate(project.createdAt)}</div>
            <div>Updated: {formatDate(project.updatedAt)}</div>
            {project.archivedAt && (
              <div>Archived: {formatDate(project.archivedAt)}</div>
            )}
          </div>
          
          {!isFinished && (
            <ProjectStatusSelect
              currentStatus={project.status}
              onStatusChange={handleStatusChange}
              disabled={isLoading || isUpdating}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}