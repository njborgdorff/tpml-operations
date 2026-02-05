import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@/types/project";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const getStatusVariant = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return "info";
      case ProjectStatus.COMPLETE:
        return "warning";
      case ProjectStatus.APPROVED:
        return "success";
      case ProjectStatus.FINISHED:
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return "In Progress";
      case ProjectStatus.COMPLETE:
        return "Complete";
      case ProjectStatus.APPROVED:
        return "Approved";
      case ProjectStatus.FINISHED:
        return "Finished";
      default:
        return status;
    }
  };

  return (
    <Badge variant={getStatusVariant(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}