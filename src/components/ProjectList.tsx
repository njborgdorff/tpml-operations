import { useState, useMemo } from 'react'
import { ProjectCard } from './ProjectCard'
import { ProjectFilters } from './ProjectFilters'
import { useProjects } from '@/hooks/useProjects'
import { ProjectStatus, ProjectFilters as Filters } from '@/types/project'

export function ProjectList() {
  const [filters, setFilters] = useState<Filters>({
    status: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE],
    showArchived: false
  })

  const { projects, loading, error, updateProjectStatus } = useProjects(filters)

  const projectCounts = useMemo(() => {
    // We need to calculate counts from all projects, not just filtered ones
    // For now, we'll estimate based on current filter results
    // In a real app, you'd want a separate API call for counts
    const activeCount = projects.filter(p => 
      p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.COMPLETE
    ).length
    
    const finishedCount = projects.filter(p => 
      p.status === ProjectStatus.FINISHED
    ).length

    return {
      active: filters.showArchived ? activeCount : projects.length,
      finished: filters.showArchived ? finishedCount : 0,
      total: projects.length
    }
  }, [projects, filters])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and track their progress
          </p>
        </div>
      </div>

      <ProjectFilters
        filters={filters}
        onFiltersChange={setFilters}
        projectCounts={projectCounts}
      />

      {projects.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-muted-foreground mt-2">
              {filters.status?.includes(ProjectStatus.FINISHED)
                ? "No finished projects yet"
                : "Create your first project to get started"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusUpdate={updateProjectStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}