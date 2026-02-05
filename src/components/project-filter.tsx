'use client'

import { Button } from '@/components/ui/button'
import { ProjectFilter } from '@/lib/types'

interface ProjectFilterProps {
  currentFilter: ProjectFilter
  onFilterChange: (filter: ProjectFilter) => void
  counts?: {
    all: number
    active: number
    finished: number
  }
}

export function ProjectFilterComponent({
  currentFilter,
  onFilterChange,
  counts
}: ProjectFilterProps) {
  const filters = [
    { key: 'ALL' as ProjectFilter, label: 'All Projects', count: counts?.all },
    { key: 'ACTIVE' as ProjectFilter, label: 'Active', count: counts?.active },
    { key: 'FINISHED' as ProjectFilter, label: 'Finished', count: counts?.finished },
  ]

  return (
    <div className="flex space-x-2">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={currentFilter === filter.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className="relative"
        >
          {filter.label}
          {typeof filter.count === 'number' && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              currentFilter === filter.key 
                ? 'bg-primary-foreground text-primary' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {filter.count}
            </span>
          )}
        </Button>
      ))}
    </div>
  )
}