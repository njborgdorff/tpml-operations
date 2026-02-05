'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ProjectStatus, ProjectFilters as ProjectFiltersType } from '@/lib/types'
import { formatProjectStatus } from '@/lib/utils'

interface ProjectFiltersProps {
  filters: ProjectFiltersType
  onFiltersChange: (filters: ProjectFiltersType) => void
}

const FILTER_OPTIONS = [
  { value: 'active', label: 'Active Projects', description: 'In Progress & Complete' },
  { value: 'in_progress', label: 'In Progress', description: 'Currently being worked on' },
  { value: 'complete', label: 'Complete', description: 'Ready for approval' },
  { value: 'approved', label: 'Approved', description: 'Ready to finish' },
  { value: 'finished', label: 'Finished', description: 'Archived projects' },
  { value: 'all', label: 'All Projects', description: 'Everything' }
]

export function ProjectFilters({ filters, onFiltersChange }: ProjectFiltersProps) {
  const getCurrentFilterValue = () => {
    if (filters.showFinished) return 'finished'
    if (!filters.status || filters.status.length === 0) return 'active'
    if (filters.status.length === 1) {
      return filters.status[0].toLowerCase()
    }
    if (filters.status.length === 2 && 
        filters.status.includes(ProjectStatus.IN_PROGRESS) && 
        filters.status.includes(ProjectStatus.COMPLETE)) {
      return 'active'
    }
    return 'all'
  }

  const handleFilterChange = (value: string) => {
    switch (value) {
      case 'active':
        onFiltersChange({
          status: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE],
          showFinished: false
        })
        break
      case 'in_progress':
        onFiltersChange({
          status: [ProjectStatus.IN_PROGRESS],
          showFinished: false
        })
        break
      case 'complete':
        onFiltersChange({
          status: [ProjectStatus.COMPLETE],
          showFinished: false
        })
        break
      case 'approved':
        onFiltersChange({
          status: [ProjectStatus.APPROVED],
          showFinished: false
        })
        break
      case 'finished':
        onFiltersChange({
          status: [ProjectStatus.FINISHED],
          showFinished: true
        })
        break
      case 'all':
        onFiltersChange({
          status: undefined,
          showFinished: true
        })
        break
    }
  }

  const clearFilters = () => {
    onFiltersChange({
      status: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE],
      showFinished: false
    })
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={getCurrentFilterValue()} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear Filters
      </Button>
    </div>
  )
}