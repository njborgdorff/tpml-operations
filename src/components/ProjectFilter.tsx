"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProjectStatus } from "@prisma/client"

export type FilterType = 'all' | 'active' | 'archived' | ProjectStatus

interface ProjectFilterProps {
  currentFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  projectCounts: {
    all: number
    active: number
    archived: number
    [ProjectStatus.IN_PROGRESS]: number
    [ProjectStatus.COMPLETE]: number
    [ProjectStatus.APPROVED]: number
  }
}

const filterLabels: Record<FilterType, string> = {
  all: 'All Projects',
  active: 'Active',
  archived: 'Finished',
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.COMPLETE]: 'Complete',
  [ProjectStatus.APPROVED]: 'Approved'
}

export function ProjectFilter({ currentFilter, onFilterChange, projectCounts }: ProjectFilterProps) {
  const filters: FilterType[] = [
    'all',
    'active',
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.COMPLETE,
    ProjectStatus.APPROVED,
    'archived'
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map((filter) => {
        const count = projectCounts[filter] || 0
        const isActive = currentFilter === filter
        
        return (
          <Button
            key={filter}
            variant={isActive ? "default" : "outline"}
            onClick={() => onFilterChange(filter)}
            className="flex items-center gap-2"
          >
            {filterLabels[filter]}
            <Badge 
              variant={isActive ? "secondary" : "outline"}
              className="ml-1"
            >
              {count}
            </Badge>
          </Button>
        )
      })}
    </div>
  )
}