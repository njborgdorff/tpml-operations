import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectWithUser, ProjectFilters, CreateProjectData, UpdateProjectStatusData } from '@/lib/types';
import { ProjectStatus } from '@prisma/client';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  history: (id: string) => [...projectKeys.detail(id), 'history'] as const,
};

// Fetch projects with optional filters
export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async (): Promise<ProjectWithUser[]> => {
      const params = new URLSearchParams();
      
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.filter) {
        params.append('filter', filters.filter);
      }

      const response = await fetch(`/api/projects?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    }
  });
}

// Create a new project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectData): Promise<ProjectWithUser> => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    }
  });
}

// Update project status
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status 
    }: { 
      id: string; 
      status: ProjectStatus; 
    }): Promise<ProjectWithUser> => {
      const response = await fetch(`/api/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update project status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    }
  });
}

// Fetch project status history
export function useProjectHistory(projectId: string) {
  return useQuery({
    queryKey: projectKeys.history(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch project history');
      }
      return response.json();
    },
    enabled: !!projectId
  });
}