// @ts-nocheck — Legacy component; not used by active codebase
'use client'

import { useState } from 'react'
import { ProjectStatus, ProjectWithHistory } from '@/lib/types'
import { getStatusLabel, canMoveToFinished } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface BulkStatusUpdateProps {
  projects: ProjectWithHistory[]
  onBulkStatusUpdate: (projectIds: string[], status: ProjectStatus) => Promise<void>
  isUpdating?: boolean
}

export function BulkStatusUpdate({
  projects,
  onBulkStatusUpdate,
  isUpdating = false
}: BulkStatusUpdateProps) {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [targetStatus, setTargetStatus] = useState<ProjectStatus | ''>('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleProjectSelection = (projectId: string, checked: boolean) => {
    setSelectedProjects(prev =>
      checked
        ? [...prev, projectId]
        : prev.filter(id => id !== projectId)
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(projects.map(p => p.id))
    } else {
      setSelectedProjects([])
    }
  }

  const getValidStatusOptions = () => {
    if (selectedProjects.length === 0) return []

    const selectedProjectStatuses = selectedProjects.map(id => 
      projects.find(p => p.id === id)?.status
    ).filter(Boolean) as ProjectStatus[]

    // Find common valid transitions
    const commonStatuses = [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED]
    
    // Special case: if all selected projects are APPROVED, allow FINISHED
    if (selectedProjectStatuses.every(status => status === ProjectStatus.APPROVED)) {
      commonStatuses.push(ProjectStatus.FINISHED)
    }

    return commonStatuses
  }

  const handleBulkUpdate = async () => {
    if (!targetStatus || selectedProjects.length === 0) return

    try {
      await onBulkStatusUpdate(selectedProjects, targetStatus as ProjectStatus)
      setSelectedProjects([])
      setTargetStatus('')
      setShowConfirmDialog(false)
    } catch (error) {
      console.error('Bulk update failed:', error)
    }
  }

  const validStatuses = getValidStatusOptions()
  const selectedCount = selectedProjects.length
  const allSelected = selectedCount === projects.length && projects.length > 0

  if (projects.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Bulk Status Update</h3>
        <Badge variant="secondary">
          {selectedCount} of {projects.length} selected
        </Badge>
      </div>

      {/* Select All Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all"
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          disabled={isUpdating}
        />
        <label htmlFor="select-all" className="text-sm font-medium">
          Select All Projects
        </label>
      </div>

      {/* Project Selection */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {projects.map((project) => (
          <div key={project.id} className="flex items-center space-x-2">
            <Checkbox
              id={project.id}
              checked={selectedProjects.includes(project.id)}
              onCheckedChange={(checked) => 
                handleProjectSelection(project.id, checked as boolean)
              }
              disabled={isUpdating}
            />
            <label htmlFor={project.id} className="text-sm flex-1 cursor-pointer">
              {project.name}
            </label>
            <Badge className="text-xs">
              {getStatusLabel(project.status)}
            </Badge>
          </div>
        ))}
      </div>

      {/* Status Selection and Action */}
      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          <Select
            value={targetStatus}
            onValueChange={(value) => setTargetStatus(value as ProjectStatus)}
            disabled={isUpdating}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {validStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogTrigger asChild>
              <Button 
                disabled={!targetStatus || isUpdating}
                variant="default"
              >
                Update {selectedCount} Project{selectedCount !== 1 ? 's' : ''}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Bulk Status Update</DialogTitle>
                <DialogDescription>
                  You are about to update {selectedCount} project{selectedCount !== 1 ? 's' : ''} to &quot;{targetStatus && getStatusLabel(targetStatus as ProjectStatus)}&quot;.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Confirm Update'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}