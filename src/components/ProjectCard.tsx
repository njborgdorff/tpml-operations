'use client'

import { useState } from 'react'
import { MoreHorizontal, Clock, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { Project, ProjectStatus } from '@/lib/types'
import { useUpdateProjectStatus } from '@/hooks/useProjects'
import { formatDate } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const updateStatusMutation = useUpdateProjectStatus()

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === project.status) return

    setIsUpdating(true)
    try {
      await updateStatusMutation.mutateAsync({
        projectId: project.id,
        status: newStatus
      })
    } catch (error) {
      console.error('Failed to update project status:', error)
      // You might want to show a toast notification here
    } finally {
      setIsUpdating(false)
    }
  }

  const getNextStatusOptions = (currentStatus: ProjectStatus): ProjectStatus[] => {
    switch (currentStatus) {
      case ProjectStatus.IN_PROGRESS:
        return [ProjectStatus.COMPLETE]
      case ProjectStatus.COMPLETE:
        return [ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS]
      case ProjectStatus.APPROVED:
        return [ProjectStatus.FINISHED, ProjectStatus.COMPLETE]
      case ProjectStatus.FINISHED:
        return [] // Finished projects cannot be changed
      default:
        return []
    }
  }

  const nextStatusOptions = getNextStatusOptions(project.status)

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-2">
            {nextStatusOptions.length > 0 && (
              <Select
                value={project.status}
                onValueChange={(value) => handleStatusChange(value as ProjectStatus)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={project.status}>
                    {project.status.replace('_', ' ')}
                  </SelectItem>
                  {nextStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        {project.description && (
          <CardDescription className="mt-2">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {project.user?.name || project.user?.email || 'Unknown User'}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(project.updatedAt)}
            </div>
          </div>
          
          {project.archivedAt && (
            <div className="text-xs">
              Archived: {formatDate(project.archivedAt)}
            </div>
          )}
        </div>

        {project.statusHistory && project.statusHistory.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              Last updated: {formatDate(project.statusHistory[0].changedAt)} by{' '}
              {project.statusHistory[0].user?.name || project.statusHistory[0].user?.email}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}