import { Project } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectStatusSelect } from '@/components/project-status-select';

interface ProjectCardProps {
  project: Project;
  showStatusSelect?: boolean;
}

export function ProjectCard({ project, showStatusSelect = true }: ProjectCardProps) {
  const isFinished = project.status === 'FINISHED';
  
  return (
    <Card className={`transition-all hover:shadow-md ${isFinished ? 'opacity-75' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Created:</span> {formatDate(project.createdAt)}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {formatDate(project.updatedAt)}
          </div>
          {project.archivedAt && (
            <div>
              <span className="font-medium">Archived:</span> {formatDate(project.archivedAt)}
            </div>
          )}
        </div>
      </CardContent>
      
      {showStatusSelect && !isFinished && (
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">Status:</span>
            <ProjectStatusSelect 
              projectId={project.id} 
              currentStatus={project.status}
            />
          </div>
        </CardFooter>
      )}
    </Card>
  );
}