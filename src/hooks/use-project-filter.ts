'use client'

import { useState, useEffect } from 'react'
import { FilterType } from '@/types'

const FILTER_STORAGE_KEY = 'project-filter'

export function useProjectFilter() {
  const [filter, setFilterState] = useState<FilterType>('active')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load filter from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = sessionStorage.getItem(FILTER_STORAGE_KEY) as FilterType
      if (savedFilter && (savedFilter === 'active' || savedFilter === 'finished')) {
        setFilterState(savedFilter)
      }
      setIsLoaded(true)
    }
  }, [])

  // Save filter to sessionStorage when it changes
  const setFilter = (newFilter: FilterType) => {
    setFilterState(newFilter)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(FILTER_STORAGE_KEY, newFilter)
    }
  }

  return {
    filter,
    setFilter,
    isLoaded
  }
}