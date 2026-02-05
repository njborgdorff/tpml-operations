import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectStatus } from '@prisma/client';
import { Project } from '@/types/project';

interface UseProjectsParams {
  filter?: 'active' | 'finished' | 'all';
}

export function useProjects({ filter = 'all' }: UseProjectsParams = {}) {
  return useQuery({
    queryKey: ['projects', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('filter', filter);
      }
      
      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      return data.projects as Project[];
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      status 
    }: { 
      projectId: string; 
      status: ProjectStatus;
    }) => {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project status');
      }

      const data = await response.json();
      return data.project as Project;
    },
    onSuccess: () => {
      // Invalidate all project queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description 
    }: { 
      name: string; 
      description?: string;
    }) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      return data.project as Project;
    },
    onSuccess: () => {
      // Invalidate all project queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProjectHistory(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'history'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch project history');
      }
      const data = await response.json();
      return data.history;
    },
    enabled: !!projectId,
  });
}