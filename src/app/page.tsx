'use client';

import { useState, useMemo } from 'react';
import { ProjectStatus } from '@/lib/types';
import { useProjects } from '@/hooks/use-projects';
import { ProjectCard } from '@/components/project-card';
import { ProjectFilter } from '@/components/project-filter';
import { CreateProjectDialog } from '@/components/create-project-dialog';

export default function HomePage() {
  const {
    projects,
    loading,
    error,
    filter,
    updateFilter,
    updateProjectStatus,
    createProject,
  } = useProjects();

  const [activeFilter, setActiveFilter] = useState<'active' | 'finished'>('active');

  const handleFilterChange = (newFilter: 'active' | 'finished') => {
    setActiveFilter(newFilter);
    updateFilter({
      showActive: newFilter === 'active',
      showFinished: newFilter === 'finished',
    });
  };

  const projectCounts = useMemo(() => {
    // We'll need to fetch counts separately since we're filtering
    // For now, use the current projects list
    return {
      active: activeFilter === 'active' ? projects.length : 0,
      finished: activeFilter === 'finished' ? projects.length : 0,
    };
  }, [projects, activeFilter]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-gray-500">Loading projects...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Project Management Dashboard
        </h1>
        <div className="flex items-center justify-between">
          <ProjectFilter
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            activeCounts={projectCounts}
          />
          {activeFilter === 'active' && (
            <CreateProjectDialog onCreateProject={createProject} />
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {activeFilter === 'active' ? 'No active projects' : 'No finished projects'}
            </h3>
            <p className="text-gray-500">
              {activeFilter === 'active'
                ? 'Create your first project to get started.'
                : 'Projects that are marked as finished will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusUpdate={updateProjectStatus}
              readOnly={activeFilter === 'finished'}
            />
          ))}
        </div>
      )}
    </div>
  );
}