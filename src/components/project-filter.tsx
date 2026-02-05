import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ProjectStatus } from '@prisma/client'

interface ProjectFilterProps {
  view: 'active' | 'finished' | 'all'
  status: ProjectStatus | 'all'
  onViewChange: (view: 'active' | 'finished' | 'all') => void
  onStatusChange: (status: ProjectStatus | 'all') => void
}

export function ProjectFilter({ view, status, onViewChange, onStatusChange }: ProjectFilterProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Button
          variant={view === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('active')}
        >
          Active Projects
        </Button>
        <Button
          variant={view === 'finished' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('finished')}
        >
          Finished Projects
        </Button>
        <Button
          variant={view === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('all')}
        >
          All Projects
        </Button>
      </div>

      {view !== 'finished' && (
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as ProjectStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={ProjectStatus.IN_PROGRESS}>In Progress</SelectItem>
            <SelectItem value={ProjectStatus.COMPLETE}>Complete</SelectItem>
            <SelectItem value={ProjectStatus.APPROVED}>Approved</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}