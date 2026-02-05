'use client'

import { Button } from '@/components/ui/button'

export type FilterType = 'all' | 'active' | 'finished'

interface ProjectFilterProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts?: {
    all: number
    active: number
    finished: number
  }
}

export function ProjectFilter({ activeFilter, onFilterChange, counts }: ProjectFilterProps) {
  const filters: Array<{ key: FilterType; label: string; description: string }> = [
    { key: 'all', label: 'All Projects', description: 'Show all projects regardless of status' },
    { key: 'active', label: 'Active Projects', description: 'In Progress and Complete projects' },
    { key: 'finished', label: 'Finished Projects', description: 'Archived projects' }
  ]

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className="flex items-center gap-2"
        >
          {filter.label}
          {counts && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-background/20 rounded">
              {counts[filter.key]}
            </span>
          )}
        </Button>
      ))}
    </div>
  )
}