'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectStatusBadge } from '@/components/project-status-badge'
import { ProjectStatusSelect } from '@/components/project-status-select'
import { Project, ProjectStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
  onProjectUpdate?: (updatedProject: Project) => void
  readOnly?: boolean
}

export function ProjectCard({ project, onProjectUpdate, readOnly = false }: ProjectCardProps) {
  const [currentProject, setCurrentProject] = useState(project)

  const handleStatusChange = (newStatus: ProjectStatus) => {
    const updatedProject = {
      ...currentProject,
      status: newStatus,
      updatedAt: new Date(),
      archivedAt: newStatus === ProjectStatus.FINISHED ? new Date() : currentProject.archivedAt
    }
    setCurrentProject(updatedProject)
    onProjectUpdate?.(updatedProject)
  }

  const isFinished = currentProject.status === ProjectStatus.FINISHED

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${isFinished ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{currentProject.name}</CardTitle>
            {currentProject.description && (
              <CardDescription className="mt-2">
                {currentProject.description}
              </CardDescription>
            )}
          </div>
          <ProjectStatusBadge status={currentProject.status} className="ml-3" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Created:</span> {formatDate(currentProject.createdAt)}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {formatDate(currentProject.updatedAt)}
          </div>
          {currentProject.archivedAt && (
            <div>
              <span className="font-medium">Archived:</span> {formatDate(currentProject.archivedAt)}
            </div>
          )}
          {currentProject.user && (
            <div>
              <span className="font-medium">Owner:</span> {currentProject.user.name || currentProject.user.email}
            </div>
          )}
        </div>
      </CardContent>

      {!readOnly && !isFinished && (
        <CardFooter className="pt-0">
          <ProjectStatusSelect
            currentStatus={currentProject.status}
            projectId={currentProject.id}
            onStatusChange={handleStatusChange}
          />
        </CardFooter>
      )}
    </Card>
  )
}