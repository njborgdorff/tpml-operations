'use client';

import { useProjects } from '@/hooks/use-projects';
import { ProjectCard } from '@/components/project-card';
import { ProjectFilterComponent } from '@/components/project-filter';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Dashboard() {
  const {
    projects,
    loading,
    error,
    filter,
    projectCounts,
    updateProjectStatus,
    createProject,
    changeFilter,
  } = useProjects();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      await createProject(newProjectName.trim(), newProjectDescription.trim() || undefined);
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsCreating(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your projects and track their progress
          </p>
        </div>
        
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New Project'}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter project name"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isCreating || !newProjectName.trim()}>
                {isCreating ? 'Creating...' : 'Create Project'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <ProjectFilterComponent
        currentFilter={filter}
        onFilterChange={changeFilter}
        projectCounts={projectCounts}
      />

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-lg font-medium mb-2">No projects found</div>
          <div className="text-muted-foreground mb-4">
            {filter === 'active' && 'No active projects. '}
            {filter === 'finished' && 'No finished projects. '}
            {filter === 'all' && 'No projects created yet. '}
            {filter !== 'all' && 'Try changing the filter or '}
            Create your first project to get started.
          </div>
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusUpdate={updateProjectStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}