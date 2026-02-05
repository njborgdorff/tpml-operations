'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProjectStatus } from '@prisma/client'

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  userId: string
  user: {
    id: string
    name: string | null
    email: string
  }
  statusHistory?: Array<{
    id: string
    oldStatus: ProjectStatus | null
    newStatus: ProjectStatus
    changedAt: string
    user: {
      name: string | null
      email: string
    }
  }>
}

export interface ProjectFilters {
  status?: ProjectStatus | 'all'
  view?: 'active' | 'finished' | 'all'
}

export function useProjects(filters: ProjectFilters = {}) {
  const queryParams = new URLSearchParams()
  
  if (filters.status && filters.status !== 'all') {
    queryParams.set('status', filters.status)
  }
  
  if (filters.view && filters.view !== 'all') {
    queryParams.set('view', filters.view)
  }

  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async (): Promise<Project[]> => {
      const url = `/api/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      return response.json()
    },
  })
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
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
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all project queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjectHistory(projectId: string) {
  return useQuery({
    queryKey: ['project-history', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/history`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch project history')
      }
      
      return response.json()
    },
    enabled: !!projectId,
  })
}