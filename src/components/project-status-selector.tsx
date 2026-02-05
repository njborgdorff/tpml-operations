'use client'

import { ProjectStatus } from '@/lib/types'
import { getStatusLabel, canMoveToFinished } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProjectStatusSelectorProps {
  currentStatus: ProjectStatus
  onStatusChange: (status: ProjectStatus) => void
  disabled?: boolean
}

export function ProjectStatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false
}: ProjectStatusSelectorProps) {
  const getAvailableStatuses = () => {
    switch (currentStatus) {
      case ProjectStatus.IN_PROGRESS:
        return [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
      case ProjectStatus.COMPLETE:
        return [ProjectStatus.COMPLETE, ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS]
      case ProjectStatus.APPROVED:
        return [ProjectStatus.APPROVED, ProjectStatus.FINISHED, ProjectStatus.COMPLETE]
      case ProjectStatus.FINISHED:
        return [ProjectStatus.FINISHED] // Cannot change finished projects
      default:
        return [currentStatus]
    }
  }

  const availableStatuses = getAvailableStatuses()
  const isFinished = currentStatus === ProjectStatus.FINISHED

  return (
    <Select
      value={currentStatus}
      onValueChange={(value) => onStatusChange(value as ProjectStatus)}
      disabled={disabled || isFinished}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {getStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}