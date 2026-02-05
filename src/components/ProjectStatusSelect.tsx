import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectStatus } from '@/types/project'

interface ProjectStatusSelectProps {
  value: ProjectStatus
  onChange: (status: ProjectStatus) => void
  disabled?: boolean
  className?: string
}

const statusOptions = [
  { value: ProjectStatus.IN_PROGRESS, label: 'In Progress' },
  { value: ProjectStatus.COMPLETE, label: 'Complete' },
  { value: ProjectStatus.APPROVED, label: 'Approved' },
]

export function ProjectStatusSelect({
  value,
  onChange,
  disabled,
  className
}: ProjectStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}