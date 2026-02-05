'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { ProjectFilters } from '@/lib/types';
import { ProjectCard } from '@/components/project-card';
import { ProjectFilter } from '@/components/project-filter';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, CheckCircle, Clock, Award, Archive } from 'lucide-react';

interface ProjectDashboardProps {
  onCreateProject?: () => void;
}

export function ProjectDashboard({ onCreateProject }: ProjectDashboardProps) {
  const [filters, setFilters] = useState<ProjectFilters>({});
  
  const {
    data: projects,
    isLoading,
    error,
    isError
  } = useProjects(filters);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load projects</p>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  const getFilterTitle = () => {
    if (filters.filter === 'active') return 'Active Projects';
    if (filters.filter === 'finished') return 'Finished Projects';
    if (filters.status) {
      const statusLabels = {
        'IN_PROGRESS': 'In Progress Projects',
        'COMPLETE': 'Complete Projects', 
        'APPROVED': 'Approved Projects',
        'FINISHED': 'Finished Projects'
      };
      return statusLabels[filters.status] || 'Filtered Projects';
    }
    return 'All Projects';
  };

  const getFilterDescription = () => {
    if (filters.filter === 'active') return 'Projects in progress or complete';
    if (filters.filter === 'finished') return 'Archived and completed projects';
    if (filters.status) return `Projects with ${filters.status.toLowerCase().replace('_', ' ')} status`;
    return 'All your projects across all statuses';
  };

  // Get status counts for dashboard stats
  const statusCounts = projects?.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalProjects = projects?.length || 0;
  const activeProjects = (statusCounts.IN_PROGRESS || 0) + (statusCounts.COMPLETE || 0);
  const finishedProjects = statusCounts.FINISHED || 0;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{getFilterTitle()}</h1>
          <p className="text-muted-foreground">
            {getFilterDescription()}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              {totalProjects} total
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {activeProjects} active
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              {finishedProjects} finished
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ProjectFilter 
            filters={filters} 
            onFiltersChange={setFilters}
          />
          
          {onCreateProject && (
            <Button onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview Cards - only show when not filtered */}
      {!filters.status && !filters.filter && totalProjects > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.IN_PROGRESS || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Complete</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.COMPLETE || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Approved</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.APPROVED || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Finished</p>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.FINISHED || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-muted-foreground">
              {filters.filter || filters.status
                ? 'Try adjusting your filters to see more projects'
                : 'Get started by creating your first project'
              }
            </p>
            {onCreateProject && !filters.filter && !filters.status && (
              <Button onClick={onCreateProject} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sprint 1 Feature Showcase */}
      {totalProjects === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">Sprint 1 Features Ready to Demo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">📊 Status Tracking</h4>
              <p className="text-blue-700 text-xs">Four-stage workflow: In Progress → Complete → Approved → Finished</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">🎯 Smart Filtering</h4>
              <p className="text-blue-700 text-xs">Filter by status or view Active vs Finished projects</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">📱 Dashboard UI</h4>
              <p className="text-blue-700 text-xs">Color-coded badges, status controls, and responsive design</p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-4">Create your first project to see these features in action!</p>
        </div>
      )}
    </div>
  );
}