'use client';

import { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { ProjectCard } from './project-card';
import { ProjectFilter, FilterType } from './project-filter';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { ProjectStatus } from '@prisma/client';

interface ProjectsDashboardProps {
  onCreateProject?: () => void;
}

export function ProjectsDashboard({ onCreateProject }: ProjectsDashboardProps) {
  const [currentFilter, setCurrentFilter] = useState<FilterType>('active');
  const { data: projects, isLoading, error } = useProjects({ filter: currentFilter });

  // Calculate project counts for all filters
  const { data: allProjects } = useProjects({ filter: 'all' });
  const projectCounts = useMemo(() => {
    if (!allProjects) return undefined;
    
    return {
      all: allProjects.length,
      active: allProjects.filter(p => 
        p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.COMPLETE
      ).length,
      finished: allProjects.filter(p => p.status === ProjectStatus.FINISHED).length,
    };
  }, [allProjects]);

  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load projects</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const getEmptyStateMessage = () => {
    switch (currentFilter) {
      case 'active':
        return 'No active projects found. Create your first project to get started!';
      case 'finished':
        return 'No finished projects yet. Complete and approve projects to see them here.';
      default:
        return 'No projects found. Create your first project to get started!';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage your project lifecycle from start to finish
          </p>
        </div>
        {onCreateProject && (
          <Button onClick={onCreateProject} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      <div className="mb-8">
        <ProjectFilter
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
          projectCounts={projectCounts}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-gray-600">Loading projects...</span>
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">{getEmptyStateMessage()}</p>
            {onCreateProject && currentFilter !== 'finished' && (
              <Button onClick={onCreateProject}>
                Create Your First Project
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showStatusActions={currentFilter !== 'finished'}
            />
          ))}
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {projects.length} {currentFilter} project{projects.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}