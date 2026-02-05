"use client"

import { useState, useEffect } from "react"
import { ProjectWithHistory } from "@/types/project"
import { ProjectCard } from "@/components/project-card"
import { ProjectFilter } from "@/components/project-filter"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"

interface ProjectDashboardProps {
  initialProjects: ProjectWithHistory[]
  currentUserId: string
}

export function ProjectDashboard({ initialProjects, currentUserId }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<ProjectWithHistory[]>(initialProjects)
  const [currentFilter, setCurrentFilter] = useState("ALL")
  const [isLoading, setIsLoading] = useState(false)

  const fetchProjects = async (filter?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter && filter !== "ALL") {
        params.append("status", filter)
      }
      params.append("userId", currentUserId)

      const response = await fetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter)
    fetchProjects(filter)
  }

  const handleStatusChange = () => {
    // Refresh projects when status changes
    fetchProjects(currentFilter)
  }

  const handleRefresh = () => {
    fetchProjects(currentFilter)
  }

  useEffect(() => {
    // Set up periodic refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchProjects(currentFilter)
    }, 30000)

    return () => clearInterval(interval)
  }, [currentFilter, currentUserId])

  const getFilteredProjectsCount = () => {
    return projects.length
  }

  const getEmptyMessage = () => {
    switch (currentFilter) {
      case "ACTIVE":
        return "No active projects found. Active projects are those that are In Progress or Complete."
      case "FINISHED":
        return "No finished projects found. Finished projects are archived projects."
      case "IN_PROGRESS":
        return "No projects in progress."
      case "COMPLETE":
        return "No completed projects."
      case "APPROVED":
        return "No approved projects."
      default:
        return "No projects found. Create your first project to get started."
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your project statuses and track progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <ProjectFilter
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
        />
        <div className="text-sm text-muted-foreground">
          {getFilteredProjectsCount()} project{getFilteredProjectsCount() !== 1 ? "s" : ""} found
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading projects...
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground max-w-md mx-auto">
            <p>{getEmptyMessage()}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserId={currentUserId}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}