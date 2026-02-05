import { ProjectFilter } from "@/types/project"

const FILTER_STORAGE_KEY = 'project-filter'

export const getStoredFilter = (): ProjectFilter => {
  if (typeof window === 'undefined') return 'ALL'
  
  try {
    const stored = sessionStorage.getItem(FILTER_STORAGE_KEY)
    if (stored && ['ALL', 'ACTIVE', 'FINISHED', 'IN_PROGRESS', 'COMPLETE', 'APPROVED'].includes(stored)) {
      return stored as ProjectFilter
    }
  } catch (error) {
    console.warn('Failed to read filter from session storage:', error)
  }
  
  return 'ALL'
}

export const setStoredFilter = (filter: ProjectFilter): void => {
  if (typeof window === 'undefined') return
  
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, filter)
  } catch (error) {
    console.warn('Failed to store filter in session storage:', error)
  }
}