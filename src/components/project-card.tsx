import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectStatusBadge } from '@/components/project-status-badge'
import { ProjectActions } from '@/components/project-actions'
import { formatDate } from '@/lib/utils'
import { ProjectStatus } from '@prisma/client'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description?: string | null
    status: ProjectStatus
    createdAt: Date | string
    updatedAt: Date | string
    archivedAt?: Date | string | null
    user: {
      id: string
      name: string | null
      email: string
    }
    _count: {
      statusHistory: number
    }
  }
  onStatusChange?: (projectId: string, status: ProjectStatus) => void
  isReadOnly?: boolean
}

export function ProjectCard({ project, onStatusChange, isReadOnly = false }: ProjectCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          {project.description && (
            <CardDescription className="mt-1">
              {project.description}
            </CardDescription>
          )}
        </div>
        {!isReadOnly && (
          <ProjectActions 
            project={project} 
            onStatusChange={onStatusChange}
          />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <ProjectStatusBadge status={project.status} />
            <span className="text-sm text-muted-foreground">
              {project._count.statusHistory} status changes
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {formatDate(project.createdAt)}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{' '}
              {formatDate(project.updatedAt)}
            </div>
            {project.archivedAt && (
              <div className="col-span-2">
                <span className="font-medium">Archived:</span>{' '}
                {formatDate(project.archivedAt)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}