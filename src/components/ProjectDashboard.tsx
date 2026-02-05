'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectCard } from './ProjectCard'
import { ProjectFilters } from './ProjectFilters'
import { useProjects } from '@/hooks/useProjects'
import { ProjectFilters as ProjectFiltersType, ProjectStatus } from '@/lib/types'

export function ProjectDashboard() {
  const [filters, setFilters] = useState<ProjectFiltersType>({
    status: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE],
    showFinished: false
  })

  const { data: projects, isLoading, error } = useProjects(filters)

  const getEmptyStateMessage = () => {
    if (filters.showFinished && filters.status?.includes(ProjectStatus.FINISHED)) {
      return "No finished projects found."
    }
    if (filters.status?.length === 1) {
      const status = filters.status[0]
      switch (status) {
        case ProjectStatus.IN_PROGRESS:
          return "No projects in progress."
        case ProjectStatus.COMPLETE:
          return "No completed projects."
        case ProjectStatus.APPROVED:
          return "No approved projects."
        default:
          return "No projects found with this status."
      }
    }
    return "No active projects found."
  }

  const getPageTitle = () => {
    if (filters.showFinished && filters.status?.includes(ProjectStatus.FINISHED)) {
      return "Finished Projects"
    }
    return "Project Dashboard"
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Failed to load projects</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please try refreshing the page
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your project lifecycle
          </p>
        </div>
        {!filters.showFinished && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <ProjectFilters filters={filters} onFiltersChange={setFilters} />

      {/* Project Count */}
      {!isLoading && projects && (
        <div className="text-sm text-muted-foreground">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} found
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading projects...</span>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && projects && projects.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && projects && projects.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">{getEmptyStateMessage()}</p>
            {!filters.showFinished && (
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}