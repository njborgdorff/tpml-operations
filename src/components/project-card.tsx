"use client"

import { ProjectWithHistory } from "@/types/project"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectStatusBadge } from "@/components/project-status-badge"
import { ProjectStatusSelect } from "@/components/project-status-select"
import { formatDate } from "@/lib/utils"

interface ProjectCardProps {
  project: ProjectWithHistory
  currentUserId: string
  onStatusChange?: () => void
}

export function ProjectCard({ project, currentUserId, onStatusChange }: ProjectCardProps) {
  const handleStatusChange = () => {
    onStatusChange?.()
  }

  const latestStatusChange = project.statusHistory[0]

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription className="mt-1">
              {project.description || "No description provided"}
            </CardDescription>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <p>Created: {formatDate(project.createdAt)}</p>
              <p>Updated: {formatDate(project.updatedAt)}</p>
              {project.archivedAt && (
                <p>Archived: {formatDate(project.archivedAt)}</p>
              )}
            </div>
            <ProjectStatusSelect
              currentStatus={project.status}
              projectId={project.id}
              userId={currentUserId}
              onStatusChange={handleStatusChange}
            />
          </div>
          
          {latestStatusChange && (
            <div className="text-sm text-muted-foreground border-t pt-3">
              <p>
                Last status change: {formatDate(latestStatusChange.changedAt)} by{" "}
                {latestStatusChange.user.name || latestStatusChange.user.email}
              </p>
              {latestStatusChange.oldStatus && (
                <p>
                  Changed from{" "}
                  <span className="font-medium">
                    {latestStatusChange.oldStatus.replace("_", " ").toLowerCase()}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {latestStatusChange.newStatus.replace("_", " ").toLowerCase()}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}