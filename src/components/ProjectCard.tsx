"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ProjectCardProps {
  project: Project
  onStatusChange: (projectId: string, newStatus: string) => void
}

const statusColors = {
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
  COMPLETE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Complete' },
  APPROVED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Approved' },
  FINISHED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Finished' }
}

export function ProjectCard({ project, onStatusChange }: ProjectCardProps) {
  const statusStyle = statusColors[project.status as keyof typeof statusColors] || statusColors.IN_PROGRESS

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(project.id, newStatus)
  }

  const getAvailableStatuses = () => {
    switch (project.status) {
      case 'IN_PROGRESS':
        return ['COMPLETE']
      case 'COMPLETE':
        return ['IN_PROGRESS', 'APPROVED']
      case 'APPROVED':
        return ['COMPLETE', 'FINISHED']
      case 'FINISHED':
        return [] // No status changes allowed for finished projects
      default:
        return []
    }
  }

  const availableStatuses = getAvailableStatuses()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </Badge>
            {availableStatuses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {availableStatuses.map((status) => {
                    const statusInfo = statusColors[status as keyof typeof statusColors]
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusChange(status)}
                      >
                        Mark as {statusInfo.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {project.description && (
          <CardDescription>{project.description}</CardDescription>
        )}
      </CardHeader>
      <CardFooter className="text-sm text-gray-500">
        <div className="flex justify-between w-full">
          <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardFooter>
    </Card>
  )
}