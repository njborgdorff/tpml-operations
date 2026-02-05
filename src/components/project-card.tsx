'use client'

import { useState } from 'react'
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectStatusSelect } from './project-status-select'
import { ProjectStatusHistory } from './project-status-history'
import { formatDate } from '@/lib/utils'
import { Clock, User, Calendar } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  onStatusUpdate: (projectId: string, newStatus: string) => Promise<void>
}

export function ProjectCard({ project, onStatusUpdate }: ProjectCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  
  const statusColor = PROJECT_STATUS_COLORS[project.status]
  const statusLabel = PROJECT_STATUS_LABELS[project.status]

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            {project.description && (
              <p className="text-sm text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Project metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{project.user.name || project.user.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Created {formatDate(project.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Updated {formatDate(project.updatedAt)}</span>
          </div>
        </div>

        {/* Status update control */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <ProjectStatusSelect
              projectId={project.id}
              currentStatus={project.status}
              onStatusUpdate={onStatusUpdate}
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs"
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </Button>
        </div>

        {/* Status history */}
        {showHistory && (
          <div className="border-t pt-3">
            <ProjectStatusHistory projectId={project.id} history={project.statusHistory} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}