'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ProjectStatus } from '@/types/project'

interface ProjectFilterProps {
  currentFilter: string
  onFilterChange: (filter: 'ACTIVE' | 'FINISHED' | ProjectStatus | null) => void
}

export function ProjectFilter({ currentFilter, onFilterChange }: ProjectFilterProps) {
  const filters = [
    { key: null, label: 'All Projects' },
    { key: 'ACTIVE', label: 'Active Projects' },
    { key: ProjectStatus.IN_PROGRESS, label: 'In Progress' },
    { key: ProjectStatus.COMPLETE, label: 'Complete' },
    { key: ProjectStatus.APPROVED, label: 'Approved' },
    { key: 'FINISHED', label: 'Finished Projects' }
  ]

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
      {filters.map((filter) => (
        <Button
          key={filter.key || 'all'}
          variant={currentFilter === filter.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}