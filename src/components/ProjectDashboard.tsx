'use client'

import { useState, useEffect } from 'react'
import { ProjectCard } from '@/components/ProjectCard'
import { ProjectFilter, FilterType } from '@/components/ProjectFilter'
import { Button } from '@/components/ui/button'
import { ProjectStatus } from '@prisma/client'
import { Plus, AlertCircle } from 'lucide-react'

interface Project {
  id: string
  name: string
  description?: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  user: {
    id: string
    name?: string | null
    email: string
  }
  statusHistory?: Array<{
    id: string
    oldStatus?: ProjectStatus | null
    newStatus: ProjectStatus
    changedAt: string
    user: {
      id: string
      name?: string | null
      email: string
    }
  }>
}

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterType>('active')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async (filter: FilterType = 'all') => {
    try {
      setIsLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('filter', filter)
      }
      
      const response = await fetch(`/api/projects?${params.toString()}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view projects')
        }
        throw new Error(`Failed to fetch projects: ${response.statusText}`)
      }
      
      const data = await response.json()
      setProjects(data)
      setFilteredProjects(data)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects(activeFilter)
  }, [activeFilter])

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter)
    // Store filter preference in sessionStorage
    sessionStorage.setItem('projectFilter', filter)
  }

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update project status')
      }

      // Refresh projects after status change
      await fetchProjects(activeFilter)
    } catch (err) {
      console.error('Error updating project status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }

  const handleCreateProject = async () => {
    const name = prompt('Enter project name:')
    if (!name) return

    const description = prompt('Enter project description (optional):')

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      // Refresh projects after creation
      await fetchProjects(activeFilter)
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  // Calculate counts for filter badges
  const getCounts = () => {
    const activeCount = projects.filter(p => 
      p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.COMPLETE
    ).length
    const finishedCount = projects.filter(p => 
      p.status === ProjectStatus.FINISHED
    ).length
    
    return {
      all: projects.length,
      active: activeCount,
      finished: finishedCount
    }
  }

  // Initialize filter from sessionStorage
  useEffect(() => {
    const savedFilter = sessionStorage.getItem('projectFilter') as FilterType
    if (savedFilter && savedFilter !== activeFilter) {
      setActiveFilter(savedFilter)
    }
  }, [])

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchProjects(activeFilter)}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Project Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your projects and track their progress
            </p>
          </div>
          <Button onClick={handleCreateProject} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        <ProjectFilter 
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          counts={getCounts()}
        />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium mb-2">
                {activeFilter === 'finished' ? 'No finished projects' : 
                 activeFilter === 'active' ? 'No active projects' : 'No projects found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {activeFilter === 'finished' 
                  ? 'Projects you move to finished will appear here.'
                  : 'Get started by creating your first project.'}
              </p>
              {activeFilter !== 'finished' && (
                <Button onClick={handleCreateProject} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}