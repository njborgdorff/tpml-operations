"use client"

import { useState, useEffect, useCallback } from "react"
import { ProjectStatus } from "@prisma/client"
import { ProjectCard } from "./ProjectCard"
import { ProjectFilter } from "./ProjectFilter"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Plus } from "lucide-react"

interface Project {
  id: string
  name: string
  description?: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  user: {
    id: string
    name?: string | null
    email?: string | null
  }
}

interface DashboardProps {
  initialProjects: Project[]
}

export function Dashboard({ initialProjects }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [filter, setFilter] = useState<"all" | "active" | "finished">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let url = "/api/projects"
      if (filter === "active") {
        url += "?filter=active"
      } else if (filter === "finished") {
        url += "?filter=finished"
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }

      const data = await response.json()
      setProjects(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load projects"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleStatusUpdate = async (projectId: string, newStatus: ProjectStatus) => {
    const response = await fetch(`/api/projects/${projectId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to update status" }))
      throw new Error(errorData.error || "Failed to update project status")
    }

    // Refresh projects after status update
    await fetchProjects()
  }

  const handleRetry = () => {
    setError(null)
    fetchProjects()
  }

  // Calculate counts for filter buttons
  const allProjects = projects
  const activeProjects = projects.filter(p => 
    p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.COMPLETE
  )
  const finishedProjects = projects.filter(p => p.status === ProjectStatus.ARCHIVED)

  const counts = {
    all: allProjects.length,
    active: activeProjects.length,
    finished: finishedProjects.length,
  }

  const filteredProjects = (() => {
    switch (filter) {
      case "active":
        return activeProjects
      case "finished":
        return finishedProjects
      default:
        return allProjects
    }
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and track their progress
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <ProjectFilter
        currentFilter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Error loading projects</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isLoading}
          >
            Try Again
          </Button>
        </div>
      )}

      {isLoading && !error && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading projects...</span>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <div className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {filter === "active" && "No active projects"}
            {filter === "finished" && "No finished projects"}
            {filter === "all" && "No projects found"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {filter === "active" && "You don't have any active projects yet."}
            {filter === "finished" && "No projects have been archived yet."}
            {filter === "all" && "Get started by creating your first project."}
          </p>
          {filter !== "finished" && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}

      {!isLoading && !error && filteredProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}