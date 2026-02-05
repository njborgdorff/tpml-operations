import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, ProjectStatus, ProjectFilters } from '@/lib/types';

const API_BASE = '/api/projects';

export function useProjects(filters?: ProjectFilters) {
  const queryParams = new URLSearchParams();
  
  if (filters?.status?.length) {
    queryParams.set('status', filters.status.join(','));
  }
  
  if (filters?.showFinished) {
    queryParams.set('showFinished', 'true');
  }

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  return useQuery<Project[]>({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      const response = await fetch(`${API_BASE}/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update project status');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all project queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProjectHistory(projectId: string) {
  return useQuery({
    queryKey: ['project-history', projectId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${projectId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch project history');
      }
      return response.json();
    },
    enabled: !!projectId,
  });
}