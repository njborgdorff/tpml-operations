'use client'

import React, { useState } from 'react'
import { ProjectCard } from '@/components/ProjectCard'
import { ProjectFilter } from '@/components/ProjectFilter'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/hooks/useProjects'
import { ProjectStatus } from '@/types/project'

// Mock user for development - in real app this would come from auth
const MOCK_USER_ID = 'user_1'

export default function DashboardPage() {
  const [currentFilter, setCurrentFilter] = useState<string | null>('ACTIVE')
  const { projects, isLoading, error, updateProjectStatus, createProject } = useProjects({
    filter: currentFilter,
    userId: MOCK_USER_ID
  })

  const handleStatusUpdate = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      await updateProjectStatus(projectId, newStatus)
    } catch (error) {
      console.error('Failed to update project status:', error)
      // In a real app, show toast notification
    }
  }

  const handleCreateProject = async () => {
    try {
      await createProject({
        name: `New Project ${Date.now()}`,
        description: 'A sample project created from the dashboard'
      })
    } catch (error) {
      console.error('Failed to create project:', error)
      // In a real app, show toast notification
    }
  }

  const getFilterLabel = () => {
    switch (currentFilter) {
      case 'ACTIVE':
        return 'Active Projects'
      case 'FINISHED':
        return 'Finished Projects'
      case ProjectStatus.IN_PROGRESS:
        return 'In Progress Projects'
      case ProjectStatus.COMPLETE:
        return 'Complete Projects'
      case ProjectStatus.APPROVED:
        return 'Approved Projects'
      default:
        return 'All Projects'
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
          <div className="text-lg text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Project Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your projects and track their progress
            </p>
          </div>
          <Button onClick={handleCreateProject}>
            Create Project
          </Button>
        </div>

        {/* Filters */}
        <ProjectFilter
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
        />

        {/* Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{getFilterLabel()}</h2>
            <span className="text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-lg text-muted-foreground mb-2">
                No projects found
              </div>
              <div className="text-sm text-muted-foreground">
                {currentFilter === 'ACTIVE' 
                  ? "Create a new project to get started"
                  : `No projects match the ${getFilterLabel().toLowerCase()} filter`
                }
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onStatusUpdate={handleStatusUpdate}
                  currentUserId={MOCK_USER_ID}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}