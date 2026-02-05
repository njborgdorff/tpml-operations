'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectStatus, User } from '@prisma/client';
import { ProjectCard } from '@/components/project-card';
import { ErrorBoundary } from '@/components/error-boundary';
import { Plus, Filter, Search, AlertCircle, Loader2 } from 'lucide-react';
import { isActiveProject } from '@/lib/project-utils';

interface ProjectWithUser extends Project {
  user: Pick<User, 'id' | 'name' | 'email'>;
}

interface ProjectResponse {
  projects: ProjectWithUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

type FilterStatus = 'active' | 'finished' | 'all';

interface ProjectDashboardProps {
  initialProjects?: ProjectWithUser[];
  onCreateProject?: () => void;
}

export function ProjectDashboard({ initialProjects = [], onCreateProject }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<ProjectWithUser[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingProjects, setUpdatingProjects] = useState<Set<string>>(new Set());

  // Fetch projects based on filter
  const fetchProjects = useCallback(async (filterStatus: FilterStatus) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects?status=${filterStatus}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: ProjectResponse = await response.json();
      setProjects(data.projects);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle filter changes
  useEffect(() => {
    fetchProjects(filter);
  }, [filter, fetchProjects]);

  // Handle status updates
  const handleStatusUpdate = async (projectId: string, newStatus: ProjectStatus) => {
    setUpdatingProjects(prev => new Set(prev.add(projectId)));
    
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const { project } = await response.json();

      // Update the project in state
      setProjects(prevProjects => 
        prevProjects.map(p => p.id === projectId ? project : p)
      );

      // If moving to finished and we're showing active projects, remove from list
      if (newStatus === ProjectStatus.FINISHED && filter === 'active') {
        setProjects(prevProjects => 
          prevProjects.filter(p => p.id !== projectId)
        );
      }

      // If moving from finished and we're showing finished projects, remove from list
      if (newStatus !== ProjectStatus.FINISHED && filter === 'finished') {
        setProjects(prevProjects => 
          prevProjects.filter(p => p.id !== projectId)
        );
      }

    } catch (err) {
      console.error('Failed to update project status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project status');
    } finally {
      setUpdatingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  // Filter projects by search term
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get project counts for filter badges
  const getProjectCounts = () => {
    return {
      active: projects.filter(p => isActiveProject(p.status)).length,
      finished: projects.filter(p => p.status === ProjectStatus.FINISHED).length,
      all: projects.length,
    };
  };

  const counts = getProjectCounts();

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600 mt-2">
                Manage your project lifecycle from inception to completion
              </p>
            </div>
            {onCreateProject && (
              <button
                onClick={onCreateProject}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          {/* Filter Tabs */}
          <div className="flex space-x-1">
            {[
              { key: 'active', label: 'Active', count: counts.active },
              { key: 'finished', label: 'Finished', count: counts.finished },
              { key: 'all', label: 'All', count: counts.all },
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as FilterStatus)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filterOption.label}
                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  {filterOption.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-xs w-full sm:max-w-none sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchProjects(filter)}
                  className="text-sm text-red-600 underline mt-2 hover:text-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading projects...</span>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && (
          <>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Filter className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm 
                    ? 'No projects match your search' 
                    : filter === 'finished' 
                      ? 'No finished projects yet'
                      : 'No projects yet'
                  }
                </h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : filter === 'finished'
                      ? 'Projects you move to finished will appear here'
                      : 'Create your first project to get started'
                  }
                </p>
                {!searchTerm && onCreateProject && (
                  <button
                    onClick={onCreateProject}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onStatusUpdate={handleStatusUpdate}
                    isUpdating={updatingProjects.has(project.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}