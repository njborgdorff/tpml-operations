'use client';

import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/project-card';
import { ProjectFilterTabs } from '@/components/project-filter-tabs';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

interface ProjectsDashboardProps {
  onCreateProject?: () => void;
}

export function ProjectsDashboard({ onCreateProject }: ProjectsDashboardProps) {
  const [activeView, setActiveView] = useState<'active' | 'finished'>('active');
  
  const { data: projects, isLoading, error } = useProjects(activeView);

  // Get counts for tabs
  const { data: activeProjects } = useProjects('active');
  const { data: finishedProjects } = useProjects('finished');
  
  const activeCounts = {
    active: activeProjects?.length || 0,
    finished: finishedProjects?.length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        Failed to load projects. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your project lifecycle and status tracking
          </p>
        </div>
        
        {onCreateProject && (
          <Button onClick={onCreateProject} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <ProjectFilterTabs
        activeView={activeView}
        onViewChange={setActiveView}
        activeCounts={activeCounts}
      />

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showStatusSelect={activeView === 'active'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">
            {activeView === 'active' ? 'No Active Projects' : 'No Finished Projects'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {activeView === 'active' 
              ? 'Create your first project to get started'
              : 'Projects will appear here once they are moved to finished'
            }
          </p>
          {onCreateProject && activeView === 'active' && (
            <Button onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}
    </div>
  );
}