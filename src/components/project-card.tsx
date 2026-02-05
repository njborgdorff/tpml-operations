"use client"

import { ProjectStatus } from "@prisma/client"
import { ProjectStatusBadge } from "@/components/project-status-badge"
import { ProjectStatusSelect } from "@/components/project-status-select"
import { formatDistanceToNow } from "date-fns"

interface Project {
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
    changedAt: string
    newStatus: ProjectStatus
    user: {
      name: string | null
      email: string
    }
  }>
}

interface ProjectCardProps {
  project: Project
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => void
  showStatusSelect?: boolean
}

export function ProjectCard({ 
  project, 
  onStatusChange, 
  showStatusSelect = true 
}: ProjectCardProps) {
  const isFinished = project.status === ProjectStatus.FINISHED
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
        <div className="ml-4">
          {showStatusSelect && !isFinished ? (
            <ProjectStatusSelect
              projectId={project.id}
              currentStatus={project.status}
              onStatusChange={(newStatus) => onStatusChange?.(project.id, newStatus)}
            />
          ) : (
            <ProjectStatusBadge status={project.status} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
        </div>
        {lastStatusChange && (
          <div>
            Status changed {formatDistanceToNow(new Date(lastStatusChange.changedAt), { addSuffix: true })}
            {lastStatusChange.user.name && (
              <span className="ml-1">by {lastStatusChange.user.name}</span>
            )}
          </div>
        )}
        {isFinished && project.archivedAt && (
          <div>
            Archived {formatDistanceToNow(new Date(project.archivedAt), { addSuffix: true })}
          </div>
        )}
      </div>
    </div>
  )
}