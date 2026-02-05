'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectFilter } from '@/types/project'
import { getStoredFilter, setStoredFilter } from '@/lib/session-storage'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilterState] = useState<ProjectFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize filter from session storage
  useEffect(() => {
    const storedFilter = getStoredFilter()
    setFilterState(storedFilter)
  }, [])

  // Fetch projects whenever filter changes
  useEffect(() => {
    fetchProjects()
  }, [filter])

  const setFilter = (newFilter: ProjectFilter) => {
    setFilterState(newFilter)
    setStoredFilter(newFilter)
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects?filter=${filter}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You need to sign in to view projects')
        }
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You need to sign in to create projects')
        }
        throw new Error('Failed to create project')
      }

      const newProject = await response.json()
      
      // Add to the current projects list if it matches the current filter
      if (filter === 'ALL' || filter === 'ACTIVE' || filter === 'IN_PROGRESS') {
        setProjects(prev => [newProject, ...prev])
      }
      
      return newProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project'
      setError(errorMessage)
      throw err
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You need to sign in to update projects')
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to update this project')
        }
        throw new Error('Failed to update project status')
      }

      const updatedProject = await response.json()
      
      // Update the project in the current list
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId ? updatedProject : project
        )
      )
      
      // If the updated project no longer matches the current filter, remove it from the list
      const shouldRemove = checkIfProjectShouldBeRemovedFromFilter(updatedProject, filter)
      if (shouldRemove) {
        setProjects(prev => prev.filter(project => project.id !== projectId))
      }
      
      return updatedProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project status'
      setError(errorMessage)
      throw err
    }
  }

  const refreshProjects = () => {
    fetchProjects()
  }

  return {
    projects,
    filter,
    setFilter,
    loading,
    error,
    createProject,
    updateProjectStatus,
    refreshProjects,
  }
}

// Helper function to determine if a project should be removed from the current filter view
function checkIfProjectShouldBeRemovedFromFilter(project: Project, currentFilter: ProjectFilter): boolean {
  switch (currentFilter) {
    case 'ACTIVE':
      return !['IN_PROGRESS', 'COMPLETE'].includes(project.status)
    case 'FINISHED':
      return project.status !== 'ARCHIVED'
    case 'IN_PROGRESS':
      return project.status !== 'IN_PROGRESS'
    case 'COMPLETE':
      return project.status !== 'COMPLETE'
    case 'APPROVED':
      return project.status !== 'APPROVED'
    case 'ALL':
    default:
      return false
  }
}