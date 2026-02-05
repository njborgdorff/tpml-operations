"use client"

import { useState, useEffect, useCallback } from 'react'
import { Project, ProjectStatus, ProjectFilter } from '@/types/project'

interface UseProjectsOptions {
  initialFilter?: ProjectFilter
}

export function useProjects(options: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ProjectFilter>(options.initialFilter || {})

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          params.set('status', filter.status.join(','))
        } else {
          params.set('status', filter.status)
        }
      }
      
      if (filter.userId) {
        params.set('userId', filter.userId)
      }
      
      if (filter.includeFinished !== undefined) {
        params.set('includeFinished', filter.includeFinished.toString())
      }

      const response = await fetch(`/api/projects?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filter])

  const updateProjectStatus = useCallback(async (projectId: string, newStatus: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const updatedProject = await response.json()
      
      // Update the project in the local state
      setProjects(prev => 
        prev.map(p => p.id === projectId ? updatedProject : p)
      )
      
      return updatedProject
    } catch (err) {
      console.error('Error updating project status:', err)
      throw err
    }
  }, [])

  const createProject = useCallback(async (projectData: { name: string; description?: string }) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const newProject = await response.json()
      
      // Add the new project to local state
      setProjects(prev => [newProject, ...prev])
      
      return newProject
    } catch (err) {
      console.error('Error creating project:', err)
      throw err
    }
  }, [])

  // Fetch projects when filter changes
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    loading,
    error,
    filter,
    setFilter,
    updateProjectStatus,
    createProject,
    refetch: fetchProjects
  }
}