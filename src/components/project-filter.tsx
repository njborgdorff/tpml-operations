'use client'

import { ProjectFilter as ProjectFilterType } from '@/types/project'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProjectFilterProps {
  filter: ProjectFilterType
  onFilterChange: (filter: ProjectFilterType) => void
  projectCounts?: {
    all: number
    active: number
    finished: number
    inProgress: number
    complete: number
    approved: number
  }
}

const FILTER_LABELS: Record<ProjectFilterType, string> = {
  ALL: 'All Projects',
  ACTIVE: 'Active Projects',
  FINISHED: 'Finished Projects',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  APPROVED: 'Approved'
}

export function ProjectFilter({ filter, onFilterChange, projectCounts }: ProjectFilterProps) {
  const getFilterLabel = (filterType: ProjectFilterType): string => {
    const baseLabel = FILTER_LABELS[filterType]
    if (!projectCounts) return baseLabel
    
    const getCount = () => {
      switch (filterType) {
        case 'ALL': return projectCounts.all
        case 'ACTIVE': return projectCounts.active
        case 'FINISHED': return projectCounts.finished
        case 'IN_PROGRESS': return projectCounts.inProgress
        case 'COMPLETE': return projectCounts.complete
        case 'APPROVED': return projectCounts.approved
        default: return 0
      }
    }
    
    const count = getCount()
    return `${baseLabel} (${count})`
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Filter:</label>
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{getFilterLabel('ALL')}</SelectItem>
          <SelectItem value="ACTIVE">{getFilterLabel('ACTIVE')}</SelectItem>
          <SelectItem value="FINISHED">{getFilterLabel('FINISHED')}</SelectItem>
          <SelectItem value="IN_PROGRESS">{getFilterLabel('IN_PROGRESS')}</SelectItem>
          <SelectItem value="COMPLETE">{getFilterLabel('COMPLETE')}</SelectItem>
          <SelectItem value="APPROVED">{getFilterLabel('APPROVED')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}