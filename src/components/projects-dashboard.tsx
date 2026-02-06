// @ts-nocheck — Legacy component; not used by active codebase
'use client'

import { ProjectCard } from '@/components/project-card'
import { ProjectFilterComponent } from '@/components/project-filter'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { useProjects } from '@/hooks/use-projects'
import { ProjectStatus } from '@/lib/types'

export function ProjectsDashboard() {
  const {
    projects,
    loading,
    error,
    filter,
    updateProject,
    createProject,
    handleFilterChange,
    getCounts
  } = useProjects()

  const handleProjectCreate = async (name: string, description?: string) => {
    await createProject(name, description)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading projects...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error: {error}</div>
        </div>
      </div>
    )
  }

  const isFinishedView = filter === 'FINISHED'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {isFinishedView ? 'Finished Projects' : 'Project Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {isFinishedView 
            ? 'View your completed and archived projects' 
            : 'Manage your projects and track their progress'
          }
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <ProjectFilterComponent
          currentFilter={filter}
          onFilterChange={handleFilterChange}
          counts={getCounts}
        />
        
        {!isFinishedView && (
          <CreateProjectDialog onProjectCreate={handleProjectCreate} />
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-lg text-muted-foreground mb-2">
            {filter === 'ALL' ? 'No projects found' : `No ${filter.toLowerCase()} projects`}
          </div>
          {filter === 'ALL' && (
            <p className="text-sm text-muted-foreground">
              Create your first project to get started
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProjectUpdate={updateProject}
              readOnly={isFinishedView}
            />
          ))}
        </div>
      )}
    </div>
  )
}