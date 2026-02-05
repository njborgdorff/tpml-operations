import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ProjectStatus } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return "bg-blue-100 text-blue-800"
    case ProjectStatus.COMPLETE:
      return "bg-yellow-100 text-yellow-800"
    case ProjectStatus.APPROVED:
      return "bg-green-100 text-green-800"
    case ProjectStatus.FINISHED:
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function getStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return "In Progress"
    case ProjectStatus.COMPLETE:
      return "Complete"
    case ProjectStatus.APPROVED:
      return "Approved"
    case ProjectStatus.FINISHED:
      return "Finished"
    default:
      return "Unknown"
  }
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function isActiveProject(status: ProjectStatus): boolean {
  return status === ProjectStatus.IN_PROGRESS || status === ProjectStatus.COMPLETE
}

export function canMoveToFinished(status: ProjectStatus): boolean {
  return status === ProjectStatus.APPROVED
}