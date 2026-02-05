'use client'

import { ProjectStatusHistory as StatusHistoryType, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project'
import { formatDate } from '@/lib/utils'
import { ArrowRight, Clock } from 'lucide-react'

interface ProjectStatusHistoryProps {
  projectId: string
  history: StatusHistoryType[]
}

export function ProjectStatusHistory({ projectId, history }: ProjectStatusHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No status history available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Status History
      </h4>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {history.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs border-l-2 border-l-blue-200"
          >
            <div className="flex items-center gap-2 flex-1">
              {entry.oldStatus && (
                <>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${PROJECT_STATUS_COLORS[entry.oldStatus]}`}>
                    {PROJECT_STATUS_LABELS[entry.oldStatus]}
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                </>
              )}
              <span className={`px-1.5 py-0.5 rounded text-xs ${PROJECT_STATUS_COLORS[entry.newStatus]}`}>
                {PROJECT_STATUS_LABELS[entry.newStatus]}
              </span>
            </div>
            
            <div className="text-right text-gray-500 min-w-0 flex-shrink-0 ml-2">
              <div className="font-medium">{entry.user.name || entry.user.email}</div>
              <div>{formatDate(entry.changedAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}