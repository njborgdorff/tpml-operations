import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, ProjectStatus, CreateProjectData, UpdateProjectStatusData } from '@/lib/types';

const API_BASE = '/api/projects';

// Fetch projects with optional filtering
export const useProjects = (view?: 'active' | 'finished', status?: ProjectStatus) => {
  const queryParams = new URLSearchParams();
  if (view) queryParams.append('view', view);
  if (status) queryParams.append('status', status);
  
  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  return useQuery<Project[]>({
    queryKey: ['projects', view, status],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    },
  });
};

// Create a new project
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectData): Promise<Project> => {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

// Update project status
export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status 
    }: { 
      id: string; 
      status: ProjectStatus; 
    }): Promise<Project> => {
      const response = await fetch(`${API_BASE}/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project status');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

// Fetch project status history
export const useProjectHistory = (projectId: string) => {
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
};