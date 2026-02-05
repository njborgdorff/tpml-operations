"use client"

import { useState, useMemo } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { ProjectCard } from './project-card'
import { ProjectFilter, FilterOption } from './project-filter'
import { ProjectStatus } from '@/types/project'
import { Button } from './ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { CreateProjectDialog } from './create-project-dialog'

export function ProjectDashboard() {
  const [currentFilter, setCurrentFilter] = useState<FilterOption>('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Convert filter option to API filter
  const apiFilter = useMemo(() => {
    switch (currentFilter) {
      case 'all':
        return { includeFinished: true }
      case 'active':
        return { 
          status: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED] 
        }
      case 'finished':
        return { status: ProjectStatus.FINISHED }
      default:
        return { status: currentFilter as ProjectStatus }
    }
  }, [currentFilter])

  const { 
    projects, 
    loading, 
    error, 
    updateProjectStatus, 
    createProject 
  } = useProjects({ initialFilter: apiFilter })

  // Update filter when selection changes
  const handleFilterChange = (filter: FilterOption) => {
    setCurrentFilter(filter)
  }

  const handleCreateProject = async (data: { name: string; description?: string }) => {
    try {
      await createProject(data)
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load projects</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track your project status
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <ProjectFilter
          value={currentFilter}
          onValueChange={handleFilterChange}
          className="w-[200px]"
        />
        
        <div className="text-sm text-muted-foreground">
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading projects...
            </div>
          ) : (
            `${projects.length} projects found`
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Loading skeleton */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-xl border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-muted-foreground max-w-sm">
              {currentFilter === 'active' 
                ? "You don't have any active projects. Create your first project to get started."
                : currentFilter === 'finished'
                ? "No finished projects yet. Complete and approve projects to see them here."
                : "No projects match your current filter. Try adjusting your search criteria."
              }
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusChange={updateProjectStatus}
            />
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateProject}
      />
    </div>
  )
}