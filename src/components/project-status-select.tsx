'use client'

import { useState } from 'react'
import { ProjectStatus, PROJECT_STATUS_LABELS } from '@/types/project'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface ProjectStatusSelectProps {
  projectId: string
  currentStatus: ProjectStatus
  onStatusUpdate: (projectId: string, newStatus: string) => Promise<void>
}

export function ProjectStatusSelect({ 
  projectId, 
  currentStatus, 
  onStatusUpdate 
}: ProjectStatusSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return

    setIsUpdating(true)
    try {
      await onStatusUpdate(projectId, newStatus)
      toast({
        title: "Status Updated",
        description: `Project status changed to ${PROJECT_STATUS_LABELS[newStatus as ProjectStatus]}`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project status'
      console.error('Failed to update project status:', error)
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[140px] h-8">
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