'use client'

import { ProjectFilter as FilterType } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProjectFilterProps {
  currentFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  projectCounts?: {
    all: number
    active: number
    finished: number
  }
}

export function ProjectFilter({ 
  currentFilter, 
  onFilterChange, 
  projectCounts 
}: ProjectFilterProps) {
  const formatFilterLabel = (filter: FilterType, count?: number) => {
    const labels = {
      all: 'All Projects',
      active: 'Active Projects',
      finished: 'Finished Projects'
    }
    
    const label = labels[filter]
    return count !== undefined ? `${label} (${count})` : label
  }

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Filter Projects
      </label>
      <Select value={currentFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {formatFilterLabel('all', projectCounts?.all)}
          </SelectItem>
          <SelectItem value="active">
            {formatFilterLabel('active', projectCounts?.active)}
          </SelectItem>
          <SelectItem value="finished">
            {formatFilterLabel('finished', projectCounts?.finished)}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}