'use client';

import { useState, useEffect } from 'react';
import { Project, ProjectStatus, ProjectFilter } from '@/lib/types';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  filter: ProjectFilter;
  updateFilter: (filter: ProjectFilter) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>({ showActive: true });

  const fetchProjects = async (currentFilter: ProjectFilter = filter) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (currentFilter.showActive) {
        params.set('showActive', 'true');
      }
      if (currentFilter.showFinished) {
        params.set('showFinished', 'true');
      }
      if (currentFilter.status) {
        params.set('status', currentFilter.status.join(','));
      }

      const response = await fetch(`/api/projects?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.map((project: any) => ({
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        archivedAt: project.archivedAt ? new Date(project.archivedAt) : undefined,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (newFilter: ProjectFilter) => {
    setFilter(newFilter);
    fetchProjects(newFilter);
  };

  const updateProjectStatus = async (projectId: string, status: ProjectStatus) => {
    try {
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

      const updatedProject = await response.json();
      
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...updatedProject,
                createdAt: new Date(updatedProject.createdAt),
                updatedAt: new Date(updatedProject.updatedAt),
                archivedAt: updatedProject.archivedAt
                  ? new Date(updatedProject.archivedAt)
                  : undefined,
              }
            : project
        )
      );

      // If we moved to finished and we're viewing active, refetch to remove it
      if (status === ProjectStatus.FINISHED && filter.showActive) {
        await fetchProjects();
      }
    } catch (err) {
      throw err;
    }
  };

  const createProject = async (name: string, description?: string) => {
    try {
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

      const newProject = await response.json();
      
      // Only add to list if it matches current filter
      if (filter.showActive) {
        setProjects((prev) => [
          {
            ...newProject,
            createdAt: new Date(newProject.createdAt),
            updatedAt: new Date(newProject.updatedAt),
            archivedAt: newProject.archivedAt
              ? new Date(newProject.archivedAt)
              : undefined,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      throw err;
    }
  };

  const refetch = async () => {
    await fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    filter,
    updateFilter,
    updateProjectStatus,
    createProject,
    refetch,
  };
}