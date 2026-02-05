"use client"

import { ProjectStatus, PROJECT_STATUS_LABELS } from "@/types/project"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProjectStatusSelectProps {
  value: ProjectStatus
  onValueChange: (status: ProjectStatus) => void
  disabled?: boolean
  placeholder?: string
}

export function ProjectStatusSelect({ 
  value, 
  onValueChange, 
  disabled = false,
  placeholder = "Select status..."
}: ProjectStatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.values(ProjectStatus).map((status) => (
          <SelectItem key={status} value={status}>
            {PROJECT_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}