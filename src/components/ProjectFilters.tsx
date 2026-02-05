import { Button } from '@/components/ui/button'
import { ProjectStatus, ProjectFilters as Filters } from '@/types/project'

interface ProjectFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  projectCounts: {
    active: number
    finished: number
    total: number
  }
}

export function ProjectFilters({ 
  filters, 
  onFiltersChange, 
  projectCounts 
}: ProjectFiltersProps) {
  const activeStatuses = [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
  
  const showActive = () => {
    onFiltersChange({
      status: activeStatuses,
      showArchived: false
    })
  }
  
  const showFinished = () => {
    onFiltersChange({
      status: [ProjectStatus.FINISHED],
      showArchived: true
    })
  }
  
  const showAll = () => {
    onFiltersChange({
      status: undefined,
      showArchived: true
    })
  }

  const isActiveFilter = 
    filters.status?.length === 2 && 
    filters.status.includes(ProjectStatus.IN_PROGRESS) &&
    filters.status.includes(ProjectStatus.COMPLETE) &&
    !filters.showArchived

  const isFinishedFilter = 
    filters.status?.length === 1 && 
    filters.status.includes(ProjectStatus.FINISHED)

  const isAllFilter = !filters.status && filters.showArchived

  return (
    <div className="flex items-center space-x-2 mb-6">
      <Button
        variant={isActiveFilter ? "default" : "outline"}
        onClick={showActive}
        size="sm"
      >
        Active ({projectCounts.active})
      </Button>
      
      <Button
        variant={isFinishedFilter ? "default" : "outline"}
        onClick={showFinished}
        size="sm"
      >
        Finished ({projectCounts.finished})
      </Button>
      
      <Button
        variant={isAllFilter ? "default" : "outline"}
        onClick={showAll}
        size="sm"
      >
        All ({projectCounts.total})
      </Button>
    </div>
  )
}