"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ProjectCard } from "@/components/ProjectCard";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { ProjectFilter } from "@/components/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogOut, User } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { signOut } from "next-auth/react";

type FilterType = "active" | "finished";

export function ProjectDashboard() {
  const { data: session, status } = useSession();
  const [currentFilter, setCurrentFilter] = useState<FilterType>("active");
  
  const {
    data: projects,
    isLoading,
    error,
    refetch,
  } = useProjects({ status: currentFilter });

  const projectStats = useMemo(() => {
    if (!projects) return { active: 0, finished: 0 };
    
    return projects.reduce(
      (acc, project) => {
        if (project.status === "FINISHED") {
          acc.finished++;
        } else {
          acc.active++;
        }
        return acc;
      },
      { active: 0, finished: 0 }
    );
  }, [projects]);

  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            Please sign in to access your projects.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user?.name || session.user?.email}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">{projectStats.active}</div>
          <p className="text-sm text-muted-foreground">Active Projects</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">{projectStats.finished}</div>
          <p className="text-sm text-muted-foreground">Finished Projects</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">{projectStats.active + projectStats.finished}</div>
          <p className="text-sm text-muted-foreground">Total Projects</p>
        </div>
      </div>

      {/* Actions and Filter */}
      <div className="flex items-center justify-between gap-4">
        <ProjectFilter onFilterChange={handleFilterChange} />
        <CreateProjectDialog />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load projects. Please try again.
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {currentFilter === "active" 
              ? "No active projects yet. Create your first project to get started!"
              : "No finished projects yet."
            }
          </div>
          {currentFilter === "active" && <CreateProjectDialog />}
        </div>
      )}
    </div>
  );
}