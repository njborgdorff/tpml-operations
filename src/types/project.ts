import { Project, ProjectStatus, ProjectStatusHistory, User } from "@prisma/client";

export type { ProjectStatus } from "@prisma/client";

export interface ProjectWithUser extends Project {
  user: Pick<User, "id" | "name" | "email">;
}

export interface ProjectWithHistory extends Project {
  user: Pick<User, "id" | "name" | "email">;
  projectStatusHistory: ProjectStatusHistory[];
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectStatusData {
  status: ProjectStatus;
}

export interface ProjectFilters {
  status?: ProjectStatus | "active" | "finished";
  userId?: string;
}

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  APPROVED: "Approved",
  FINISHED: "Finished",
};

export const ProjectStatusColors: Record<ProjectStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETE: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  FINISHED: "bg-gray-100 text-gray-800",
};