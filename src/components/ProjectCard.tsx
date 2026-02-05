import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ProjectStatusSelect } from './ProjectStatusSelect'
import { Project, ProjectStatus } from '@/types/project'
import { formatRelativeTime } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
  onStatusUpdate: (projectId: string, status: ProjectStatus) => Promise<void>
  className?: string
}

export function ProjectCard({ project, onStatusUpdate, className }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setIsUpdating(true)
    try {
      await onStatusUpdate(project.id, newStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            {project.description && (
              <CardDescription>{project.description}</CardDescription>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <p>Created: {formatRelativeTime(project.createdAt)}</p>
          <p>Updated: {formatRelativeTime(project.updatedAt)}</p>
          {project.archivedAt && (
            <p>Archived: {formatRelativeTime(project.archivedAt)}</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <ProjectStatusSelect
            value={project.status}
            onChange={handleStatusChange}
            disabled={isUpdating || project.status === ProjectStatus.FINISHED}
            className="w-32"
          />
        </div>
        
        {project.statusHistory && project.statusHistory.length > 0 && (
          <Button variant="ghost" size="sm">
            View History
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}