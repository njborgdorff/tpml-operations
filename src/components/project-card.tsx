"use client"

import { useState } from "react"
import { Project, ProjectStatus } from "@/types/project"
import { ProjectStatusBadge } from "./project-status-badge"
import { ProjectStatusSelect } from "./project-status-select"
import { formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProjectCardProps {
  project: Project
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => Promise<void>
  isUpdating?: boolean
  className?: string
}

export function ProjectCard({ 
  project, 
  onStatusChange, 
  isUpdating = false,
  className 
}: ProjectCardProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const handleStatusUpdate = async (newStatus: ProjectStatus) => {
    if (newStatus === project.status) {
      setIsEditingStatus(false)
      return
    }

    setIsUpdatingStatus(true)
    try {
      await onStatusChange(project.id, newStatus)
      setIsEditingStatus(false)
    } catch (error) {
      console.error('Failed to update project status:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold line-clamp-2">
          {project.name}
        </CardTitle>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditingStatus(!isEditingStatus)}>
              <Edit className="mr-2 h-4 w-4" />
              Update Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {project.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          {isEditingStatus ? (
            <div className="flex-1 max-w-40">
              <ProjectStatusSelect
                value={project.status}
                onValueChange={handleStatusUpdate}
                disabled={isUpdatingStatus}
              />
            </div>
          ) : (
            <ProjectStatusBadge status={project.status} />
          )}
          
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Updated {formatDate(project.updatedAt)}
          </div>
        </div>
        
        {project.archivedAt && (
          <div className="text-xs text-muted-foreground">
            Archived on {formatDate(project.archivedAt)}
          </div>
        )}
        
        {project.user && (
          <div className="text-xs text-muted-foreground">
            Created by {project.user.name || project.user.email}
          </div>
        )}
      </CardContent>
    </Card>
  )
}