'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterType } from '@/hooks/useProjects'

interface ProjectFilterProps {
  value: FilterType
  onValueChange: (value: FilterType) => void
  className?: string
}

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'ALL', label: 'All Projects' },
  { value: 'ACTIVE', label: 'Active Projects' },
  { value: 'FINISHED', label: 'Finished Projects' },
]

export function ProjectFilter({ value, onValueChange, className }: ProjectFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as FilterType)}>
      <SelectTrigger className={className}>
        <SelectValue />
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
