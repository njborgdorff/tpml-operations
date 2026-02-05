"use client"

import { useState } from "react"
import { ProjectStatus } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { MoreVertical, Clock, CheckCircle, Archive, AlertCircle } from "lucide-react"

interface Project {
  id: string
  name: string
  description?: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  user: {
    id: string
    name?: string | null
    email?: string | null
  }
}

interface ProjectCardProps {
  project: Project
  onStatusUpdate: (projectId: string, newStatus: ProjectStatus) => Promise<void>
}

const statusConfig = {
  [ProjectStatus.IN_PROGRESS]: {
    label: "In Progress",
    variant: "info" as const,
    icon: Clock,
  },
  [ProjectStatus.COMPLETE]: {
    label: "Complete",
    variant: "warning" as const,
    icon: CheckCircle,
  },
  [ProjectStatus.APPROVED]: {
    label: "Approved",
    variant: "success" as const,
    icon: CheckCircle,
  },
  [ProjectStatus.ARCHIVED]: {
    label: "Archived",
    variant: "secondary" as const,
    icon: Archive,
  },
}

export function ProjectCard({ project, onStatusUpdate }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === project.status) return

    setIsUpdating(true)
    setError(null)

    try {
      await onStatusUpdate(project.id, newStatus)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update status"
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const statusInfo = statusConfig[project.status]
  const StatusIcon = statusInfo.icon

  const canMoveToArchive = project.status === ProjectStatus.APPROVED

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {project.name}
            </CardTitle>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="ml-2">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              <Badge variant={statusInfo.variant}>
                {statusInfo.label}
              </Badge>
            </div>
            
            {project.status !== ProjectStatus.ARCHIVED && (
              <Select
                value={project.status}
                onValueChange={handleStatusChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProjectStatus.IN_PROGRESS}>
                    In Progress
                  </SelectItem>
                  <SelectItem value={ProjectStatus.COMPLETE}>
                    Complete
                  </SelectItem>
                  <SelectItem value={ProjectStatus.APPROVED}>
                    Approved
                  </SelectItem>
                  {canMoveToArchive && (
                    <SelectItem value={ProjectStatus.ARCHIVED}>
                      Archive Project
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Created {formatDate(project.createdAt)}</span>
            {project.archivedAt && (
              <span>Archived {formatDate(project.archivedAt)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}