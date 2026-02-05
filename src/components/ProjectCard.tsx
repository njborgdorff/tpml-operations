"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Clock, CheckCircle, Award, Archive } from "lucide-react";
import { ProjectWithUser, ProjectStatus, ProjectStatusLabels, ProjectStatusColors } from "@/types/project";
import { useUpdateProjectStatus } from "@/hooks/useProjects";
import { formatDistanceToNow } from "date-fns";

interface ProjectCardProps {
  project: ProjectWithUser;
}

const StatusIcons = {
  IN_PROGRESS: Clock,
  COMPLETE: CheckCircle,
  APPROVED: Award,
  FINISHED: Archive,
};

export function ProjectCard({ project }: ProjectCardProps) {
  const { data: session } = useSession();
  const updateStatusMutation = useUpdateProjectStatus();
  const [isUpdating, setIsUpdating] = useState(false);

  const StatusIcon = StatusIcons[project.status];
  const canEdit = session?.user?.id === project.userId;

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!canEdit) return;
    
    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        projectId: project.id,
        status: newStatus,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getAvailableStatuses = (): ProjectStatus[] => {
    switch (project.status) {
      case "IN_PROGRESS":
        return ["COMPLETE"];
      case "COMPLETE":
        return ["IN_PROGRESS", "APPROVED"];
      case "APPROVED":
        return ["COMPLETE", "FINISHED"];
      case "FINISHED":
        return []; // Finished projects cannot be changed
      default:
        return [];
    }
  };

  const availableStatuses = getAvailableStatuses();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1">
          <h3 className="font-semibold leading-none tracking-tight">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        
        {canEdit && availableStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isUpdating}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableStatuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdating}
                >
                  Mark as {ProjectStatusLabels[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge className={`${ProjectStatusColors[project.status]} flex items-center gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {ProjectStatusLabels[project.status]}
          </Badge>
          
          <div className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
          </div>
        </div>
        
        {project.archivedAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            Archived {formatDistanceToNow(new Date(project.archivedAt), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}