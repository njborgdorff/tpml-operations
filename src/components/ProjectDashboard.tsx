"use client"

import { useState, useEffect } from "react"
import { ProjectCard } from "./ProjectCard"
import { CreateProjectDialog } from "./CreateProjectDialog"
import { Button } from "./ui/button"

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

type FilterType = 'active' | 'finished' | 'all'

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<FilterType>('active')
  const [isLoading, setIsLoading] = useState(true)

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const queryParam = filter !== 'all' ? `?status=${filter}` : ''
      const response = await fetch(`/api/projects${queryParam}`)
      
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        console.error('Failed to fetch projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [filter])

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Refresh projects to reflect the change
        fetchProjects()
      } else {
        console.error('Failed to update project status')
      }
    } catch (error) {
      console.error('Error updating project status:', error)
    }
  }

  const handleProjectCreated = () => {
    fetchProjects()
  }

  const getFilterCounts = () => {
    // We need to fetch all projects to get accurate counts
    // For now, we'll show the current filtered count
    return {
      active: filter === 'active' ? projects.length : '?',
      finished: filter === 'finished' ? projects.length : '?',
      all: filter === 'all' ? projects.length : '?'
    }
  }

  const counts = getFilterCounts()

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Project Dashboard</h1>
        <CreateProjectDialog onProjectCreated={handleProjectCreated} />
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          Active Projects ({counts.active})
        </Button>
        <Button
          variant={filter === 'finished' ? 'default' : 'outline'}
          onClick={() => setFilter('finished')}
        >
          Finished Projects ({counts.finished})
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Projects ({counts.all})
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">
            {filter === 'active' && 'No active projects'}
            {filter === 'finished' && 'No finished projects'}
            {filter === 'all' && 'No projects found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {filter === 'active' && 'Create a new project to get started.'}
            {filter === 'finished' && 'Projects marked as finished will appear here.'}
            {filter === 'all' && 'Create a new project to get started.'}
          </p>
          {filter !== 'finished' && (
            <CreateProjectDialog onProjectCreated={handleProjectCreated} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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