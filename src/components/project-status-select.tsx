'use client'

import { ProjectStatus } from '@/lib/types'
import { getStatusLabel } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface ProjectStatusSelectProps {
  currentStatus: ProjectStatus
  onStatusChange: (status: ProjectStatus) => void
  disabled?: boolean
}

export function ProjectStatusSelect({ 
  currentStatus, 
  onStatusChange, 
  disabled = false 
}: ProjectStatusSelectProps) {
  const statusOptions = [
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.COMPLETE,
    ProjectStatus.APPROVED,
  ]

  return (
    <Select
      value={currentStatus}
      onValueChange={(value) => onStatusChange(value as ProjectStatus)}
      disabled={disabled}
    >
      <SelectTrigger className="w-32">
        <SelectValue>
          {getStatusLabel(currentStatus)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem key={status} value={status}>
            {getStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}