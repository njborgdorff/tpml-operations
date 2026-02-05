'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectStatus } from '@/types/project'

interface UseProjectsOptions {
  filter?: string | null
  userId?: string
}

export function useProjects({ filter, userId }: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filter) params.append('status', filter)
      if (userId) params.append('userId', userId)
      
      const response = await fetch(`/api/projects?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: ProjectStatus) => {
    if (!userId) throw new Error('User ID is required')

    const response = await fetch(`/api/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus,
        userId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update project status')
    }

    const updatedProject = await response.json()
    
    // Update local state
    setProjects(prev => 
      prev.map(project => 
        project.id === projectId ? updatedProject : project
      )
    )

    return updatedProject
  }

  const createProject = async (projectData: { name: string; description?: string }) => {
    if (!userId) throw new Error('User ID is required')

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...projectData,
        userId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create project')
    }

    const newProject = await response.json()
    
    // Add to local state if it matches current filter
    if (!filter || filter === 'ACTIVE' || filter === ProjectStatus.IN_PROGRESS) {
      setProjects(prev => [newProject, ...prev])
    }

    return newProject
  }

  useEffect(() => {
    fetchProjects()
  }, [filter, userId])

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    updateProjectStatus,
    createProject
  }
}