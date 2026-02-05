import { ProjectStatus } from '@/lib/types';
import { useUpdateProjectStatus } from '@/hooks/useProjects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ProjectStatusSelectProps {
  projectId: string;
  currentStatus: ProjectStatus;
  disabled?: boolean;
}

const statusOptions = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'FINISHED', label: 'Finished' },
];

export function ProjectStatusSelect({ 
  projectId, 
  currentStatus, 
  disabled = false 
}: ProjectStatusSelectProps) {
  const updateStatusMutation = useUpdateProjectStatus();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: projectId,
        status: newStatus as ProjectStatus,
      });
      
      toast.success('Project status updated successfully');
    } catch (error) {
      toast.error('Failed to update project status');
      console.error('Error updating project status:', error);
    }
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={disabled || updateStatusMutation.isPending}
    >
      <SelectTrigger className="w-[140px]">
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
  );
}