"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProjectFilterProps {
  currentFilter: string
  onFilterChange: (filter: string) => void
}

export function ProjectFilter({ currentFilter, onFilterChange }: ProjectFilterProps) {
  const filterOptions = [
    { value: "ALL", label: "All Projects" },
    { value: "ACTIVE", label: "Active Projects" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETE", label: "Complete" },
    { value: "APPROVED", label: "Approved" },
    { value: "FINISHED", label: "Finished (Archived)" },
  ]

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="project-filter" className="text-sm font-medium">
        Filter:
      </label>
      <Select value={currentFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-48" id="project-filter">
          <SelectValue placeholder="Select filter" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}