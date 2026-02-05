import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ProjectStatus } from "@prisma/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusVariant(status: ProjectStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "IN_PROGRESS":
      return "default"
    case "COMPLETE":
      return "secondary"
    case "APPROVED":
      return "outline"
    case "ARCHIVED":
      return "destructive"
    default:
      return "default"
  }
}

export function getStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "In Progress"
    case "COMPLETE":
      return "Complete"
    case "APPROVED":
      return "Approved"
    case "ARCHIVED":
      return "Archived"
    default:
      return status
  }
}