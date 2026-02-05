import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProjectStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case ProjectStatus.COMPLETE:
      return "bg-orange-100 text-orange-800 border-orange-200";
    case ProjectStatus.APPROVED:
      return "bg-green-100 text-green-800 border-green-200";
    case ProjectStatus.FINISHED:
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getStatusLabel(status: ProjectStatus): string {
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
      return "Unknown";
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}