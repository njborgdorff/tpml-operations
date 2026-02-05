"use client"

import { ProjectStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getStatusLabel, getStatusVariant } from "@/lib/utils"

interface ProjectFiltersProps {
  activeView: "all" | "active" | "finished"
  onViewChange: (view: "all" | "active" | "finished") => void
  statusFilter: ProjectStatus | "all"
  onStatusFilterChange: (status: ProjectStatus | "all") => void
  projectCounts: {
    all: number
    active: number
    finished: number
    inProgress: number
    complete: number
    approved: number
    archived: number
  }
}

export function ProjectFilters({ 
  activeView, 
  onViewChange, 
  statusFilter, 
  onStatusFilterChange,
  projectCounts 
}: ProjectFiltersProps) {
  const viewButtons = [
    { key: "all" as const, label: "All Projects", count: projectCounts.all },
    { key: "active" as const, label: "Active", count: projectCounts.active },
    { key: "finished" as const, label: "Finished", count: projectCounts.finished },
  ]

  const statusOptions = [
    { key: "all" as const, label: "All Statuses", count: projectCounts.all },
    { key: ProjectStatus.IN_PROGRESS, label: getStatusLabel(ProjectStatus.IN_PROGRESS), count: projectCounts.inProgress },
    { key: ProjectStatus.COMPLETE, label: getStatusLabel(ProjectStatus.COMPLETE), count: projectCounts.complete },
    { key: ProjectStatus.APPROVED, label: getStatusLabel(ProjectStatus.APPROVED), count: projectCounts.approved },
    { key: ProjectStatus.ARCHIVED, label: getStatusLabel(ProjectStatus.ARCHIVED), count: projectCounts.archived },
  ]

  return (
    <div className="space-y-6 mb-8">
      {/* View Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">View</h3>
        <div className="flex flex-wrap gap-2">
          {viewButtons.map(({ key, label, count }) => (
            <Button
              key={key}
              variant={activeView === key ? "default" : "outline"}
              onClick={() => onViewChange(key)}
              className="h-9"
            >
              {label} ({count})
            </Button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(({ key, label, count }) => {
            const isActive = statusFilter === key
            const variant = key === "all" 
              ? (isActive ? "default" : "outline")
              : getStatusVariant(key as ProjectStatus)
            
            return (
              <Badge
                key={key}
                variant={isActive ? variant : "outline"}
                className={`cursor-pointer hover:opacity-80 transition-opacity ${
                  isActive ? "" : "hover:bg-gray-100"
                }`}
                onClick={() => onStatusFilterChange(key)}
              >
                {label} ({count})
              </Badge>
            )
          })}
        </div>
      </div>
    </div>
  )
}