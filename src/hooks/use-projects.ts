'use client'

import { useState, useEffect, useCallback } from 'react'
import { Project, ProjectFilter, ProjectStatus } from '@/lib/types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ProjectFilter>('ALL')

  const fetchProjects = useCallback(async (currentFilter?: ProjectFilter) => {
    try {
      setLoading(true)
      setError(null)
      
      const filterParam = currentFilter || filter
      const url = `/api/projects?filter=${filterParam}`
      
      const response = await fetch(url)
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

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prev => 
      prev.map(p => p.id === updatedProject.id ? updatedProject : p)
    )
  }, [])

  const createProject = useCallback(async (name: string, description?: string) => {
    try {
      setError(null)
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const newProject = await response.json()
      setProjects(prev => [newProject, ...prev])
      return newProject
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      throw err
    }
  }, [])

  const handleFilterChange = useCallback((newFilter: ProjectFilter) => {
    setFilter(newFilter)
    fetchProjects(newFilter)
  }, [fetchProjects])

  const getCounts = useCallback(() => {
    const all = projects.length
    const active = projects.filter(p => 
      [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED].includes(p.status)
    ).length
    const finished = projects.filter(p => p.status === ProjectStatus.FINISHED).length
    
    return { all, active, finished }
  }, [projects])

  useEffect(() => {
    fetchProjects()
  }, [])

  return {
    projects,
    loading,
    error,
    filter,
    fetchProjects,
    updateProject,
    createProject,
    handleFilterChange,
    getCounts: getCounts()
  }
}