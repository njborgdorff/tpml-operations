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

interface ProjectStatusSelectProps {
  currentStatus: ProjectStatus
  projectId: string
  userId: string
  onStatusChange?: (newStatus: ProjectStatus) => void
  disabled?: boolean
}

export function ProjectStatusSelect({
  currentStatus,
  projectId,
  userId,
  onStatusChange,
  disabled = false
}: ProjectStatusSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === currentStatus || isUpdating || disabled) {
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newStatus,
          changedBy: userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      onStatusChange?.(newStatus)
    } catch (error) {
      console.error('Error updating project status:', error)
      // Optionally show error toast here
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PROJECT_STATUS_LABELS).map(([status, label]) => (
          <SelectItem key={status} value={status}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}