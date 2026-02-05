'use client'

import { useState } from 'react'
import { ProjectWithHistory } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from './project-status-badge'
import { ProjectStatusSelector } from './project-status-selector'
import { ProjectStatusHistoryComponent } from './project-status-history'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Clock, History } from 'lucide-react'

interface ProjectCardProps {
  project: ProjectWithHistory
  onStatusUpdate: (projectId: string, status: string) => Promise<void>
  isUpdating?: boolean
}

export function ProjectCard({ project, onStatusUpdate, isUpdating = false }: ProjectCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [isLocalUpdating, setIsLocalUpdating] = useState(false)

  const handleStatusChange = async (status: string) => {
    setIsLocalUpdating(true)
    try {
      await onStatusUpdate(project.id, status)
    } finally {
      setIsLocalUpdating(false)
    }
  }

  const loading = isUpdating || isLocalUpdating

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold truncate pr-4">
            {project.name}
          </CardTitle>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {project.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Update Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Update Status</label>
          <ProjectStatusSelector
            currentStatus={project.status}
            onStatusChange={handleStatusChange}
            disabled={loading}
          />
        </div>

        {/* Project Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Updated {formatDate(new Date(project.updatedAt))}</span>
          </div>
          {project.archivedAt && (
            <span>Archived {formatDate(new Date(project.archivedAt))}</span>
          )}
        </div>

        {/* Status History */}
        <div className="border-t pt-3">
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start p-0 h-auto">
                <History className="h-4 w-4 mr-2" />
                <span>View Status History ({project.statusHistory.length})</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Status History - {project.name}</DialogTitle>
              </DialogHeader>
              <ProjectStatusHistoryComponent history={project.statusHistory} />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}