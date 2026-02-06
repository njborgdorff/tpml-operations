'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'

interface ArchiveConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function ArchiveConfirmDialog({
  open,
  onOpenChange,
  projectName,
  onConfirm,
  isLoading,
}: ArchiveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Finished?</DialogTitle>
          <DialogDescription>
            This will archive <strong>{projectName}</strong> with an archive date
            of {formatDate(new Date())}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
          >
            {isLoading ? 'Moving...' : 'Confirm'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
