'use client'

import { useState } from 'react'
import { ProjectStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { getStatusLabel } from '@/lib/utils'

interface ProjectStatusSelectProps {
  currentStatus: ProjectStatus
  projectId: string
  onStatusChange?: (newStatus: ProjectStatus) => void
  disabled?: boolean
}

export function ProjectStatusSelect({
  currentStatus,
  projectId,
  onStatusChange,
  disabled = false
}: ProjectStatusSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const getNextStatus = (current: ProjectStatus): ProjectStatus | null => {
    switch (current) {
      case ProjectStatus.IN_PROGRESS:
        return ProjectStatus.COMPLETE
      case ProjectStatus.COMPLETE:
        return ProjectStatus.APPROVED
      case ProjectStatus.APPROVED:
        return ProjectStatus.FINISHED
      default:
        return null
    }
  }

  const handleStatusUpdate = async (newStatus: ProjectStatus) => {
    if (disabled || isUpdating) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const updatedProject = await response.json()
      onStatusChange?.(updatedProject.status)
    } catch (error) {
      console.error('Failed to update project status:', error)
      // You might want to show a toast notification here
    } finally {
      setIsUpdating(false)
    }
  }

  const nextStatus = getNextStatus(currentStatus)

  if (!nextStatus || currentStatus === ProjectStatus.FINISHED) {
    return null
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleStatusUpdate(nextStatus)}
      disabled={disabled || isUpdating}
    >
      {isUpdating ? 'Updating...' : `Mark as ${getStatusLabel(nextStatus)}`}
    </Button>
  )
}