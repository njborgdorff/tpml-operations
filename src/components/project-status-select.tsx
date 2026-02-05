"use client"

import { useState } from "react"
import { ProjectStatus } from "@prisma/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface ProjectStatusSelectProps {
  projectId: string
  currentStatus: ProjectStatus
  onStatusChange?: (newStatus: ProjectStatus) => void
  disabled?: boolean
}

const statusLabels: Record<ProjectStatus, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete", 
  APPROVED: "Approved",
  FINISHED: "Finished"
}

const statusColors: Record<ProjectStatus, string> = {
  IN_PROGRESS: "text-blue-600",
  COMPLETE: "text-yellow-600",
  APPROVED: "text-green-600", 
  FINISHED: "text-gray-600"
}

export function ProjectStatusSelect({ 
  projectId, 
  currentStatus, 
  onStatusChange,
  disabled = false
}: ProjectStatusSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === currentStatus) return

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
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      toast.success(`Project status updated to ${statusLabels[newStatus]}`)
      onStatusChange?.(newStatus)
    } catch (error) {
      console.error('Error updating project status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update project status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Don't allow changes if project is finished
  const isDisabled = disabled || isUpdating || currentStatus === ProjectStatus.FINISHED

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isDisabled}
    >
      <SelectTrigger className={`w-40 ${statusColors[currentStatus]}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusLabels).map(([status, label]) => (
          <SelectItem 
            key={status} 
            value={status}
            className={statusColors[status as ProjectStatus]}
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}