import { useState, useEffect, useCallback } from 'react'
import { Project, ProjectStatus } from '@/types/project'

export type FilterType = 'ALL' | 'ACTIVE' | 'FINISHED'

interface UseProjectsOptions {
  filter?: FilterType
}

export function useProjects(options?: UseProjectsOptions) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusChangeLoading, setStatusChangeLoading] = useState<string | null>(null)

  const filter = options?.filter || 'ALL'

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filter === 'ACTIVE') {
        params.append('filter', 'active')
      } else if (filter === 'FINISHED') {
        params.append('filter', 'finished')
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
  }, [filter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const updateProjectStatus = useCallback(async (projectId: string, status: ProjectStatus) => {
    try {
      setStatusChangeLoading(projectId)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update project status')
      }

      const updatedProject = await response.json()

      if (status === ProjectStatus.FINISHED && filter === 'ACTIVE') {
        // Moving to FINISHED while viewing ACTIVE: remove from list
        setProjects(prev => prev.filter(p => p.id !== projectId))
      } else if (status === ProjectStatus.FINISHED && filter === 'FINISHED') {
        // Moving to FINISHED while viewing FINISHED: refetch to get correct list
        await fetchProjects()
      } else {
        // Normal update: replace in-place
        setProjects(prev =>
          prev.map(project =>
            project.id === projectId ? updatedProject : project
          )
        )
      }

      return updatedProject
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
      throw err
    } finally {
      setStatusChangeLoading(null)
    }
  }, [filter, fetchProjects])

  return {
    projects,
    loading,
    error,
    statusChangeLoading,
    clearError: useCallback(() => setError(null), []),
    refetch: fetchProjects,
    updateProjectStatus,
  }
}
