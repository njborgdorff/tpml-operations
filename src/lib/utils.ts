import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'info'
    case 'COMPLETE':
      return 'warning'
    case 'APPROVED':
      return 'success'
    case 'FINISHED':
      return 'secondary'
    default:
      return 'default'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'COMPLETE':
      return 'Complete'
    case 'APPROVED':
      return 'Approved'
    case 'FINISHED':
      return 'Finished'
    default:
      return status
  }
}