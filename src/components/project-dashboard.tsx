'use client'

import { useState } from 'react'
import { ProjectCard } from './project-card'
import { ProjectFilterComponent } from './project-filter'
import { useProjects, useUpdateProjectStatus } from '@/hooks/use-projects'
import { ProjectFilter, ProjectStatus } from '@/types/project'

export function ProjectDashboard() {
  const [filter, setFilter] = useState<ProjectFilter>('active')
  const { data: projects = [], isLoading, error } = useProjects(filter)
  const updateStatusMutation = useUpdateProjectStatus()

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ projectId, status: newStatus })
    } catch (error) {
      console.error('Failed to update project status:', error)
      // In a real app, you'd show a toast notification here
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading projects...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">
            Error loading projects. Please try again.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Project Management</h1>
        <p className="text-gray-600">
          Manage your projects and track their progress through different stages.
        </p>
      </div>

      <ProjectFilterComponent 
        currentFilter={filter} 
        onFilterChange={setFilter} 
      />

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-lg text-gray-500">
            {filter === 'active' && 'No active projects found.'}
            {filter === 'finished' && 'No finished projects found.'}
            {filter === 'all' && 'No projects found.'}
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}