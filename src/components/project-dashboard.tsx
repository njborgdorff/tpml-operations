'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { ProjectFilters } from '@/lib/types';
import { ProjectCard } from '@/components/project-card';
import { ProjectFilter } from '@/components/project-filter';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

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
        <Loader2 className="h-8 w-8 animate-spin" />
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
    if (filters.status) return `${filters.status.replace('_', ' ')} Projects`;
    return 'All Projects';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{getFilterTitle()}</h1>
          <p className="text-muted-foreground">
            {projects?.length || 0} project{(projects?.length || 0) !== 1 ? 's' : ''}
          </p>
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
    </div>
  );
}