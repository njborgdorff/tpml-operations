'use client';

import { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '@/lib/types';

interface UseProjectsOptions {
  filter?: 'ALL' | 'ACTIVE' | 'FINISHED';
  userId?: string;
}

export function useProjects({ filter = 'ALL', userId }: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filter !== 'ALL') {
        params.append('status', filter);
      }
      
      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/projects?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateProjectStatus = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      setStatusChangeLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          changedBy: 'temp-user' // TODO: Replace with actual user ID from auth
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update project status');
      }

      const updatedProject = await response.json();
      
      // Update the project in the local state
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId ? updatedProject : project
        )
      );

      // If the status change moves the project out of the current filter, refetch
      if (filter === 'ACTIVE' && newStatus === ProjectStatus.FINISHED) {
        await fetchProjects();
      } else if (filter === 'FINISHED' && newStatus !== ProjectStatus.FINISHED) {
        await fetchProjects();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setStatusChangeLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [filter, userId]);

  return {
    projects,
    loading,
    error,
    statusChangeLoading,
    refetch: fetchProjects,
    updateProjectStatus
  };
}