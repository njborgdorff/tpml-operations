"use client"

import { useState } from "react"
import { ProjectStatus, PROJECT_STATUS_LABELS } from "@/types/project"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type FilterOption = 'all' | 'active' | 'finished' | ProjectStatus

interface ProjectFilterProps {
  value: FilterOption
  onValueChange: (filter: FilterOption) => void
  className?: string
}

export function ProjectFilter({ 
  value, 
  onValueChange, 
  className 
}: ProjectFilterProps) {
  const filterOptions = [
    { value: 'all' as const, label: 'All Projects' },
    { value: 'active' as const, label: 'Active Projects' },
    { value: 'finished' as const, label: 'Finished Projects' },
    { value: ProjectStatus.IN_PROGRESS, label: PROJECT_STATUS_LABELS[ProjectStatus.IN_PROGRESS] },
    { value: ProjectStatus.COMPLETE, label: PROJECT_STATUS_LABELS[ProjectStatus.COMPLETE] },
    { value: ProjectStatus.APPROVED, label: PROJECT_STATUS_LABELS[ProjectStatus.APPROVED] },
  ]

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Filter projects..." />
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