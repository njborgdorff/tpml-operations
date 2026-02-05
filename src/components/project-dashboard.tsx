'use client'

import { useState, useEffect, useCallback } from 'react'
import { Project, ProjectStatus, ProjectFilter } from '@/lib/types'
import { ProjectCard } from './project-card'
import { ProjectFilterSelect } from './project-filter'
import { Button } from './ui/button'

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async (currentFilter: ProjectFilter) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (currentFilter !== 'all') {
        params.set('filter', currentFilter)
      }
      
      const response = await fetch(`/api/projects?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`)
      }
      
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects(filter)
  }, [filter, fetchProjects])

  const handleFilterChange = (newFilter: ProjectFilter) => {
    setFilter(newFilter)
  }

  const handleStatusUpdate = async (projectId: string, status: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`)
      }

      const updatedProject = await response.json()
      
      // Update the project in the local state
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === projectId ? updatedProject : p
        )
      )

      // If the updated project no longer matches the current filter, remove it from view
      if (filter === 'active' && status === ProjectStatus.FINISHED) {
        setProjects(prevProjects => 
          prevProjects.filter(p => p.id !== projectId)
        )
      } else if (filter === 'finished' && status !== ProjectStatus.FINISHED) {
        setProjects(prevProjects => 
          prevProjects.filter(p => p.id !== projectId)
        )
      }
    } catch (err) {
      console.error('Error updating project status:', err)
      throw err
    }
  }

  const handleRefresh = () => {
    fetchProjects(filter)
  }

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects Dashboard</h1>
        <div className="flex items-center gap-4">
          <ProjectFilterSelect
            currentFilter={filter}
            onFilterChange={handleFilterChange}
          />
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {filter === 'active' 
              ? 'No active projects found.'
              : filter === 'finished'
              ? 'No finished projects found.'
              : 'No projects found.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusUpdate={handleStatusUpdate}
              isUpdating={loading}
            />
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground text-center">
        Showing {projects.length} {filter === 'all' ? '' : filter} project{projects.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}