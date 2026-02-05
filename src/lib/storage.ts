import { ProjectFilter } from './types'

const STORAGE_KEYS = {
  PROJECT_FILTER: 'finished-pm-project-filter',
} as const

export class SessionStorage {
  static getProjectFilter(): ProjectFilter {
    if (typeof window === 'undefined') return 'all'
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.PROJECT_FILTER)
      return (stored as ProjectFilter) || 'all'
    } catch (error) {
      console.warn('Failed to read from sessionStorage:', error)
      return 'all'
    }
  }

  static setProjectFilter(filter: ProjectFilter): void {
    if (typeof window === 'undefined') return
    
    try {
      sessionStorage.setItem(STORAGE_KEYS.PROJECT_FILTER, filter)
    } catch (error) {
      console.warn('Failed to write to sessionStorage:', error)
    }
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return
    
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key)
      })
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error)
    }
  }
}