'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Project, ProjectFilter, ProjectStatus, UpdateProjectStatusRequest } from '@/types/project'

const API_BASE = '/api/projects'

// Fetch projects with optional filtering
async function fetchProjects(filter: ProjectFilter = 'all'): Promise<Project[]> {
  const url = filter === 'all' ? API_BASE : `${API_BASE}?filter=${filter}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  
  return response.json()
}

// Update project status
async function updateProjectStatus(
  projectId: string, 
  data: UpdateProjectStatusRequest
): Promise<Project> {
  const response = await fetch(`${API_BASE}/${projectId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to update project status')
  }
  
  return response.json()
}

export function useProjects(filter: ProjectFilter = 'all') {
  return useQuery({
    queryKey: ['projects', filter],
    queryFn: () => fetchProjects(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: ProjectStatus }) =>
      updateProjectStatus(projectId, { status }),
    onSuccess: () => {
      // Invalidate all project queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}