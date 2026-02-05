'use client';

import { useState } from 'react';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectFilter } from '@/components/ProjectFilter';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'FINISHED'>('ACTIVE');
  
  const { 
    projects, 
    loading, 
    error, 
    statusChangeLoading, 
    refetch, 
    updateProjectStatus 
  } = useProjects({ filter });

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  const getFilterTitle = () => {
    switch (filter) {
      case 'ACTIVE':
        return 'Active Projects';
      case 'FINISHED':
        return 'Finished Projects';
      default:
        return 'All Projects';
    }
  };

  const getFilterDescription = () => {
    switch (filter) {
      case 'ACTIVE':
        return 'Projects that are in progress or complete, but not yet finished';
      case 'FINISHED':
        return 'Projects that have been archived and completed';
      default:
        return 'All projects regardless of status';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your projects and track their progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectFilter
            value={filter}
            onValueChange={setFilter}
            className="w-48"
          />
          <Button onClick={refetch} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error}</p>
            <Button onClick={refetch} className="mt-2" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{getFilterTitle()}</h2>
          <p className="text-sm text-muted-foreground">
            {getFilterDescription()}
          </p>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Projects Found</CardTitle>
              <CardDescription>
                {filter === 'ACTIVE' 
                  ? "No active projects to display. Create a new project to get started."
                  : filter === 'FINISHED'
                  ? "No finished projects yet. Complete and approve some projects first."
                  : "No projects found. Create your first project to get started."
                }
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onStatusChange={updateProjectStatus}
                onStatusChangeLoading={statusChangeLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Projects</CardDescription>
            <CardTitle className="text-2xl">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Filter Applied</CardDescription>
            <CardTitle className="text-lg">{getFilterTitle()}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Last Updated</CardDescription>
            <CardTitle className="text-sm">
              {projects.length > 0 
                ? new Date(Math.max(...projects.map(p => new Date(p.updatedAt).getTime()))).toLocaleDateString()
                : 'No projects'
              }
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}