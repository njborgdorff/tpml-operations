import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ProjectWithUser, CreateProjectData, UpdateProjectStatusData, ProjectFilters } from "@/types/project";

const PROJECTS_QUERY_KEY = "projects";

async function fetchProjects(filters?: ProjectFilters): Promise<ProjectWithUser[]> {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.append("status", filters.status);
  }
  
  const response = await fetch(`/api/projects?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch projects");
  }
  
  return response.json();
}

async function createProject(data: CreateProjectData): Promise<ProjectWithUser> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create project");
  }
  
  return response.json();
}

async function updateProjectStatus(
  projectId: string,
  data: UpdateProjectStatusData
): Promise<ProjectWithUser> {
  const response = await fetch(`/api/projects/${projectId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update project status");
  }
  
  return response.json();
}

export function useProjects(filters?: ProjectFilters) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, filters],
    queryFn: () => fetchProjects(filters),
    enabled: !!session?.user?.id,
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      toast.success(`Project "${newProject.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, ...data }: UpdateProjectStatusData & { projectId: string }) =>
      updateProjectStatus(projectId, data),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      toast.success(`Project status updated to ${updatedProject.status.toLowerCase().replace("_", " ")}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}