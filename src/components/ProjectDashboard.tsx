"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Project, ProjectStatus } from "@prisma/client"
import { ProjectCard } from "./ProjectCard"
import { ProjectFilters } from "./ProjectFilters"
import { LoadingSpinner } from "./LoadingSpinner"
import toast from "react-hot-toast"

type ProjectWithHistory = Project & {
  statusHistory: Array<{
    id: string
    changedAt: Date
    user: {
      name: string | null
      email: string
    }
  }>
}

async function fetchProjects(view?: string, status?: string): Promise<ProjectWithHistory[]> {
  const params = new URLSearchParams()
  if (view && view !== "all") {
    params.append("view", view)
  }
  if (status && status !== "all") {
    params.append("status", status)
  }

  const response = await fetch(`/api/projects?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`)
  }
  return response.json()
}

async function updateProjectStatus(projectId: string, status: ProjectStatus): Promise<ProjectWithHistory> {
  const response = await fetch(`/api/projects/${projectId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Failed to update project status: ${response.statusText}`)
  }
  
  return response.json()
}

export function ProjectDashboard() {
  const [activeView, setActiveView] = useState<"all" | "active" | "finished">("all")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const queryClient = useQueryClient()

  // Fetch all projects for filtering
  const { data: allProjects = [], isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
    staleTime: 30000, // 30 seconds
  })

  // Filter projects based on current filters
  const filteredProjects = useMemo(() => {
    let filtered = allProjects

    // Apply view filter
    if (activeView === "active") {
      filtered = filtered.filter(p => 
        p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.COMPLETE
      )
    } else if (activeView === "finished") {
      filtered = filtered.filter(p => p.status === ProjectStatus.ARCHIVED)
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    return filtered
  }, [allProjects, activeView, statusFilter])

  // Calculate project counts
  const projectCounts = useMemo(() => {
    const counts = allProjects.reduce((acc, project) => {
      acc.all++
      
      if (project.status === ProjectStatus.ARCHIVED) {
        acc.finished++
        acc.archived++
      } else {
        acc.active++
      }

      switch (project.status) {
        case ProjectStatus.IN_PROGRESS:
          acc.inProgress++
          break
        case ProjectStatus.COMPLETE:
          acc.complete++
          break
        case ProjectStatus.APPROVED:
          acc.approved++
          break
      }

      return acc
    }, {
      all: 0,
      active: 0,
      finished: 0,
      inProgress: 0,
      complete: 0,
      approved: 0,
      archived: 0,
    })

    return counts
  }, [allProjects])

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: ProjectStatus }) =>
      updateProjectStatus(projectId, status),
    onSuccess: (updatedProject) => {
      // Update the cache
      queryClient.setQueryData<ProjectWithHistory[]>(["projects"], (old) => 
        old?.map(p => p.id === updatedProject.id ? updatedProject : p) || []
      )
    },
    onError: (error: Error) => {
      console.error("Error updating project status:", error)
      toast.error(error.message || "Failed to update project status")
    }
  })

  const handleStatusUpdate = async (projectId: string, newStatus: ProjectStatus) => {
    await updateStatusMutation.mutateAsync({ projectId, status: newStatus })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <h3 className="text-lg font-semibold">Error Loading Projects</h3>
          <p className="text-sm">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Project Dashboard
        </h1>
        <p className="text-gray-600">
          Manage your projects and track their progress
        </p>
      </div>

      <ProjectFilters
        activeView={activeView}
        onViewChange={setActiveView}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        projectCounts={projectCounts}
      />

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects found
          </h3>
          <p className="text-gray-500">
            {statusFilter !== "all" || activeView !== "all" 
              ? "Try adjusting your filters to see more projects."
              : "Create your first project to get started."
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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