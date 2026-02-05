import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ProjectStatus } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatProjectStatus(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return 'In Progress'
    case ProjectStatus.COMPLETE:
      return 'Complete'
    case ProjectStatus.APPROVED:
      return 'Approved'
    case ProjectStatus.FINISHED:
      return 'Finished'
    default:
      return status
  }
}

export function getStatusVariant(status: ProjectStatus) {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return 'info'
    case ProjectStatus.COMPLETE:
      return 'warning'
    case ProjectStatus.APPROVED:
      return 'success'
    case ProjectStatus.FINISHED:
      return 'secondary'
    default:
      return 'default'
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}