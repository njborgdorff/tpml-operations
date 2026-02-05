"use client"

import { useState } from "react"
import { Project, ProjectStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getStatusLabel, getStatusVariant } from "@/lib/utils"
import { MoreHorizontal, Calendar, User } from "lucide-react"
import toast from "react-hot-toast"

type ProjectWithHistory = Project & {
  statusHistory: Array<{
    id: string
    changedAt: Date
    user: {
      name: string | null
      email: string
    }
  }>
}

interface ProjectCardProps {
  project: ProjectWithHistory
  onStatusUpdate: (projectId: string, newStatus: ProjectStatus) => Promise<void>
}

export function ProjectCard({ project, onStatusUpdate }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showStatusSelect, setShowStatusSelect] = useState(false)

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === project.status) {
      setShowStatusSelect(false)
      return
    }

    setIsUpdating(true)
    try {
      await onStatusUpdate(project.id, newStatus)
      toast.success(`Project status updated to ${getStatusLabel(newStatus)}`)
      setShowStatusSelect(false)
    } catch (error) {
      console.error("Error updating project status:", error)
      toast.error("Failed to update project status. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const lastStatusChange = project.statusHistory[0]

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-600 text-sm mb-3">
              {project.description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowStatusSelect(!showStatusSelect)}
          disabled={isUpdating}
          className="h-8 w-8"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showStatusSelect ? (
            <Select
              value={project.status}
              onValueChange={(value) => handleStatusChange(value as ProjectStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[140px]">
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
                <SelectItem value={ProjectStatus.ARCHIVED}>
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={getStatusVariant(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          )}

          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(project.updatedAt)}
          </div>
        </div>

        {lastStatusChange && (
          <div className="flex items-center text-xs text-gray-500">
            <User className="h-3 w-3 mr-1" />
            {lastStatusChange.user.name || lastStatusChange.user.email}
          </div>
        )}
      </div>

      {project.archivedAt && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500">
            Archived: {formatDate(project.archivedAt)}
          </div>
        </div>
      )}
    </div>
  )
}