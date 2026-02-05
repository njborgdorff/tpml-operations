'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Calendar, Archive } from 'lucide-react'

interface Project {
  id: string
  name: string
  status: string
}

interface ArchiveConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  project: Project | null
  isLoading?: boolean
}

export function ArchiveConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  project,
  isLoading = false
}: ArchiveConfirmationDialogProps) {
  if (!project) return null

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Error handling will be done by parent component
      console.error('Archive confirmation error:', error)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle>Move Project to Finished</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div>
              Are you sure you want to move <strong>"{project.name}"</strong> to the Finished folder?
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <Calendar className="h-4 w-4" />
              <span>Archive Date: {currentDate}</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              This project will be moved to the Finished folder and displayed in read-only mode. 
              You can still view the project details, but it will no longer appear in your active projects.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Moving...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Move to Finished
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}