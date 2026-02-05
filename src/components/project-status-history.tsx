'use client'

import { ProjectStatusHistory } from '@/lib/types'
import { formatDate, getStatusLabel } from '@/lib/utils'
import { ProjectStatusBadge } from './project-status-badge'

interface ProjectStatusHistoryProps {
  history: ProjectStatusHistory[]
}

export function ProjectStatusHistoryComponent({ history }: ProjectStatusHistoryProps) {
  if (!history.length) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No status changes recorded
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-900">Status History</h3>
      <div className="space-y-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between text-sm border-l-2 border-gray-200 pl-3 py-1"
          >
            <div className="flex items-center space-x-2">
              {entry.oldStatus && (
                <>
                  <ProjectStatusBadge status={entry.oldStatus} />
                  <span className="text-gray-400">→</span>
                </>
              )}
              <ProjectStatusBadge status={entry.newStatus} />
            </div>
            <div className="text-xs text-gray-500">
              <div>{formatDate(new Date(entry.changedAt))}</div>
              {entry.user && (
                <div className="font-medium">{entry.user.name || entry.user.email}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}