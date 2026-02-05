export const sessionStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(key, value)
    } catch {
      // Silent fail for storage errors
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // Silent fail for storage errors
    }
  }
}

export const STORAGE_KEYS = {
  PROJECT_FILTER: 'project_filter'
} as const