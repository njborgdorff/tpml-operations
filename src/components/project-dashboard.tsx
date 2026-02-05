"use client"

import { useState, useEffect } from "react"
import { ProjectStatus } from "@prisma/client"
import { ProjectCard } from "@/components/project-card"
import { ProjectFilter } from "@/components/project-filter"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  statusHistory: Array<{
    changedAt: string
    newStatus: ProjectStatus
    user: {
      name: string | null
      email: string
    }
  }>
}

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<"all" | "active" | "finished">("active")
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== "all") {
        params.append("filter", filter)
      }
      
      const response = await fetch(`/api/projects?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
      
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [filter])

  const handleStatusChange = (projectId: string, newStatus: ProjectStatus) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === projectId
          ? { ...project, status: newStatus, updatedAt: new Date().toISOString() }
          : project
      )
    )

    // If the project was moved to finished and we're viewing active projects, refetch
    if (newStatus === ProjectStatus.FINISHED && filter === "active") {
      fetchProjects()
    }
  }

  const handleCreateProject = async () => {
    const name = prompt("Enter project name:")
    if (!name || name.trim().length === 0) return

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name: name.trim(),
          description: ""
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create project")
      }

      toast.success("Project created successfully")
      fetchProjects()
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create project")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading projects...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">
            Manage your project status and archive completed work
          </p>
        </div>
        <Button onClick={handleCreateProject} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <ProjectFilter currentFilter={filter} onFilterChange={setFilter} />

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {filter === "active" && "No active projects found."}
            {filter === "finished" && "No finished projects found."}
            {filter === "all" && "No projects found."}
          </div>
          {filter !== "finished" && (
            <Button 
              onClick={handleCreateProject}
              variant="outline"
              className="mt-4"
            >
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusChange={handleStatusChange}
              showStatusSelect={project.status !== ProjectStatus.FINISHED}
            />
          ))}
        </div>
      )}
    </div>
  )
}