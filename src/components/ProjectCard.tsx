"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Clock, CheckCircle, Award, Archive } from "lucide-react"
import { ProjectStatus } from "@prisma/client"

type ProjectWithUser = {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  statusHistory: Array<{
    id: string
    oldStatus: ProjectStatus | null
    newStatus: ProjectStatus
    changedAt: string
    user: {
      name: string | null
      email: string
    }
  }>
}

interface ProjectCardProps {
  project: ProjectWithUser
  onStatusUpdate: (projectId: string, status: ProjectStatus) => void
  isUpdating?: boolean
}

const StatusIcon = ({ status }: { status: ProjectStatus }) => {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return <Clock className="w-3 h-3" />
    case ProjectStatus.COMPLETE:
      return <CheckCircle className="w-3 h-3" />
    case ProjectStatus.APPROVED:
      return <Award className="w-3 h-3" />
    case ProjectStatus.ARCHIVED:
      return <Archive className="w-3 h-3" />
    default:
      return null
  }
}

const getStatusBadgeVariant = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return "outline" as const
    case ProjectStatus.COMPLETE:
      return "secondary" as const
    case ProjectStatus.APPROVED:
      return "default" as const
    case ProjectStatus.ARCHIVED:
      return "destructive" as const
    default:
      return "outline" as const
  }
}

const formatStatus = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return "In Progress"
    case ProjectStatus.COMPLETE:
      return "Complete"
    case ProjectStatus.APPROVED:
      return "Approved"
    case ProjectStatus.ARCHIVED:
      return "Archived"
    default:
      return status
  }
}

const getAvailableStatusTransitions = (currentStatus: ProjectStatus): ProjectStatus[] => {
  switch (currentStatus) {
    case ProjectStatus.IN_PROGRESS:
      return [ProjectStatus.COMPLETE]
    case ProjectStatus.COMPLETE:
      return [ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED]
    case ProjectStatus.APPROVED:
      return [ProjectStatus.COMPLETE, ProjectStatus.ARCHIVED]
    case ProjectStatus.ARCHIVED:
      return [] // Archived projects cannot be changed
    default:
      return []
  }
}

export function ProjectCard({ project, onStatusUpdate, isUpdating = false }: ProjectCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const availableTransitions = getAvailableStatusTransitions(project.status)
  const lastStatusChange = project.statusHistory[0]

  const handleStatusChange = (newStatus: ProjectStatus) => {
    onStatusUpdate(project.id, newStatus)
    setIsMenuOpen(false)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant={getStatusBadgeVariant(project.status)}
                className="flex items-center gap-1"
              >
                <StatusIcon status={project.status} />
                {formatStatus(project.status)}
              </Badge>
            </div>
          </div>
          {availableTransitions.length > 0 && (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  disabled={isUpdating}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableTransitions.map((status) => (
                  <DropdownMenuItem 
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="flex items-center gap-2"
                  >
                    <StatusIcon status={status} />
                    Mark as {formatStatus(status)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {project.description && (
          <CardDescription className="text-sm text-gray-600">
            {project.description}
          </CardDescription>
        )}
      </CardContent>
      <CardFooter className="pt-0 text-xs text-gray-500">
        <div className="w-full space-y-1">
          <div>
            Created: {new Date(project.createdAt).toLocaleDateString()}
          </div>
          {lastStatusChange && (
            <div>
              Last updated: {new Date(lastStatusChange.changedAt).toLocaleDateString()} 
              {lastStatusChange.user.name && ` by ${lastStatusChange.user.name}`}
            </div>
          )}
          {project.archivedAt && (
            <div>
              Archived: {new Date(project.archivedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}