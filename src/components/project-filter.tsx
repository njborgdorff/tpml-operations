'use client'

import { ProjectFilter } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface ProjectFilterProps {
  currentFilter: ProjectFilter
  onFilterChange: (filter: ProjectFilter) => void
}

export function ProjectFilterSelect({ currentFilter, onFilterChange }: ProjectFilterProps) {
  const filterOptions: { value: ProjectFilter; label: string }[] = [
    { value: 'all', label: 'All Projects' },
    { value: 'active', label: 'Active Projects' },
    { value: 'finished', label: 'Finished Projects' },
  ]

  return (
    <Select
      value={currentFilter}
      onValueChange={(value) => onFilterChange(value as ProjectFilter)}
    >
      <SelectTrigger className="w-48">
        <SelectValue>
          {filterOptions.find(option => option.value === currentFilter)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {filterOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}