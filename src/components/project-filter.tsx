'use client'

import { Button } from '@/components/ui/button'
import { ProjectFilter } from '@/types/project'

interface ProjectFilterProps {
  currentFilter: ProjectFilter
  onFilterChange: (filter: ProjectFilter) => void
}

export function ProjectFilterComponent({ currentFilter, onFilterChange }: ProjectFilterProps) {
  return (
    <div className="flex gap-2 mb-6">
      <Button
        variant={currentFilter === 'active' ? 'default' : 'outline'}
        onClick={() => onFilterChange('active')}
      >
        Active Projects
      </Button>
      <Button
        variant={currentFilter === 'finished' ? 'default' : 'outline'}
        onClick={() => onFilterChange('finished')}
      >
        Finished Projects
      </Button>
      <Button
        variant={currentFilter === 'all' ? 'default' : 'outline'}
        onClick={() => onFilterChange('all')}
      >
        All Projects
      </Button>
    </div>
  )
}