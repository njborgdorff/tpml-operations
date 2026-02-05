import { useState, useEffect } from 'react'
import { Project, ProjectStatus, ProjectFilters } from '@/types/project'

export function useProjects(filters?: ProjectFilters) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters?.status) {
        params.append('status', filters.status.join(','))
      }
      if (filters?.showArchived) {
        params.append('showArchived', 'true')
      }
      
      const response = await fetch(`/api/projects?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [filters?.status?.join(','), filters?.showArchived])

  const updateProjectStatus = async (projectId: string, status: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project status')
      }

      const updatedProject = await response.json()
      
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId ? updatedProject : project
        )
      )

      return updatedProject
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
      throw err
    }
  }

  const createProject = async (data: { name: string; description?: string }) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const newProject = await response.json()
      setProjects(prevProjects => [newProject, ...prevProjects])
      
      return newProject
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      throw err
    }
  }

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    updateProjectStatus,
    createProject,
  }
}