'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProjectStatus } from '@/types'
import { ChevronDown, Check } from 'lucide-react'

interface ProjectStatusSelectProps {
  currentStatus: ProjectStatus
  onStatusChange: (status: ProjectStatus) => Promise<void>
  disabled?: boolean
}

const statusOptions = [
  { value: ProjectStatus.IN_PROGRESS, label: 'In Progress' },
  { value: ProjectStatus.COMPLETE, label: 'Complete' },
  { value: ProjectStatus.APPROVED, label: 'Approved' }
]

const statusLabels = {
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.COMPLETE]: 'Complete',
  [ProjectStatus.APPROVED]: 'Approved',
  [ProjectStatus.FINISHED]: 'Finished'
}

export function ProjectStatusSelect({ 
  currentStatus, 
  onStatusChange, 
  disabled = false 
}: ProjectStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Don't show status selector for finished projects
  if (currentStatus === ProjectStatus.FINISHED) {
    return null
  }

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === currentStatus || isLoading) return
    
    setIsLoading(true)
    try {
      await onStatusChange(newStatus)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className="min-w-[120px] justify-between"
      >
        <span>{statusLabels[currentStatus]}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[150px] rounded-md border bg-white shadow-lg">
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => handleStatusChange(option.value)}
                  disabled={isLoading}
                >
                  <span className="flex-1">{option.label}</span>
                  {currentStatus === option.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}