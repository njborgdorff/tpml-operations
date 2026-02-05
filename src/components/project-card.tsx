'use client'

import { ProjectWithHistory, ProjectStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProjectStatusBadge } from '@/components/project-status-badge'
import { ProjectStatusSelect } from '@/components/project-status-select'
import { formatRelativeTime } from '@/lib/utils'
import { Archive, User, Calendar } from 'lucide-react'

interface ProjectCardProps {
  project: ProjectWithHistory
  onStatusUpdate: (projectId: string, status: ProjectStatus) => Promise<void>
  onMoveToFinished?: (projectId: string) => Promise<void>
}

export function ProjectCard({ project, onStatusUpdate, onMoveToFinished }: ProjectCardProps) {
  const isFinished = project.status === ProjectStatus.FINISHED
  const canMoveToFinished = project.status === ProjectStatus.APPROVED && onMoveToFinished
  
  const handleMoveToFinished = async () => {
    if (canMoveToFinished) {
      await onMoveToFinished(project.id)
    }
  }

  return (
    <Card className={`transition-all hover:shadow-md ${isFinished ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-medium truncate">
              {project.name}
            </CardTitle>
            {project.description && (
              <CardDescription className="mt-1 text-sm text-gray-600 line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Project metadata */}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{project.user.name || project.user.email}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Updated {formatRelativeTime(project.updatedAt)}</span>
          </div>
        </div>

        {/* Status controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isFinished && (
              <ProjectStatusSelect
                currentStatus={project.status}
                onStatusChange={(status) => onStatusUpdate(project.id, status)}
              />
            )}
            
            {canMoveToFinished && (
              <button
                onClick={handleMoveToFinished}
                className="flex items-center space-x-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                title="Move to Finished folder"
              >
                <Archive className="h-3 w-3" />
                <span>Move to Finished</span>
              </button>
            )}
          </div>
          
          {project.archivedAt && (
            <div className="text-xs text-gray-500">
              Archived {formatRelativeTime(project.archivedAt)}
            </div>
          )}
        </div>

        {/* Latest status change */}
        {project.projectStatusHistory.length > 0 && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Last updated by {project.projectStatusHistory[0].user.name || project.projectStatusHistory[0].user.email} {' '}
            {formatRelativeTime(project.projectStatusHistory[0].changedAt)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}