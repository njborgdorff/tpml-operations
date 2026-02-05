'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectFilter, ProjectStatus, UpdateProjectStatusRequest } from '@/types/project';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>('active');

  const fetchProjects = useCallback(async (currentFilter: ProjectFilter = filter) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = currentFilter !== 'all' ? `?filter=${currentFilter}` : '';
      const response = await fetch(`/api/projects${queryParams}`);
      
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
  }, [filter]);

  const updateProjectStatus = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus } satisfies UpdateProjectStatusRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to update project status');
      }

      const updatedProject = await response.json();
      
      // Update the project in the local state
      setProjects(prev => 
        prev.map(p => p.id === projectId ? updatedProject : p)
      );

      // If the project was moved to finished and we're viewing active projects,
      // remove it from the list
      if (newStatus === ProjectStatus.FINISHED && filter === 'active') {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
      
      // If we're viewing finished projects and a project was moved out of finished,
      // remove it from the list
      if (newStatus !== ProjectStatus.FINISHED && filter === 'finished') {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err; // Re-throw to handle in component
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
      
      // Add to projects list if it matches current filter
      if (filter === 'all' || filter === 'active') {
        setProjects(prev => [newProject, ...prev]);
      }
      
      return newProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    }
  };

  const changeFilter = useCallback((newFilter: ProjectFilter) => {
    setFilter(newFilter);
    fetchProjects(newFilter);
  }, [fetchProjects]);

  // Calculate project counts for filter display
  const projectCounts = {
    all: projects.length,
    active: projects.filter(p => 
      p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.COMPLETE
    ).length,
    finished: projects.filter(p => p.status === ProjectStatus.FINISHED).length,
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    filter,
    projectCounts,
    updateProjectStatus,
    createProject,
    changeFilter,
    refetch: fetchProjects,
  };
}