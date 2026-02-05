'use client';

import { useState } from 'react';
import { Project, ProjectStatus, User } from '@prisma/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoreHorizontal, Clock, User as UserIcon, Calendar } from 'lucide-react';
import { formatStatus, getNextStatus, canMoveToFinished } from '@/lib/project-utils';
import { format } from 'date-fns';

interface ProjectWithUser extends Project {
  user: Pick<User, 'id' | 'name' | 'email'>;
}

interface ProjectCardProps {
  project: ProjectWithUser;
  onStatusUpdate: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
  isUpdating?: boolean;
}

export function ProjectCard({ project, onStatusUpdate, isUpdating = false }: ProjectCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: ProjectStatus) => {
    setUpdating(true);
    setShowActions(false);
    
    try {
      await onStatusUpdate(project.id, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    switch (project.status) {
      case ProjectStatus.IN_PROGRESS:
        actions.push({
          label: 'Mark as Complete',
          status: ProjectStatus.COMPLETE,
          className: 'text-yellow-700 hover:bg-yellow-50'
        });
        break;
      case ProjectStatus.COMPLETE:
        actions.push(
          {
            label: 'Mark as In Progress',
            status: ProjectStatus.IN_PROGRESS,
            className: 'text-blue-700 hover:bg-blue-50'
          },
          {
            label: 'Mark as Approved',
            status: ProjectStatus.APPROVED,
            className: 'text-green-700 hover:bg-green-50'
          }
        );
        break;
      case ProjectStatus.APPROVED:
        actions.push(
          {
            label: 'Mark as Complete',
            status: ProjectStatus.COMPLETE,
            className: 'text-yellow-700 hover:bg-yellow-50'
          },
          {
            label: 'Move to Finished',
            status: ProjectStatus.FINISHED,
            className: 'text-gray-700 hover:bg-gray-50'
          }
        );
        break;
    }
    
    return actions;
  };

  const isDisabled = updating || isUpdating;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {project.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {project.description || 'No description provided'}
          </p>
        </div>
        
        {project.status !== ProjectStatus.FINISHED && (
          <div className="relative ml-3">
            <button
              onClick={() => setShowActions(!showActions)}
              disabled={isDisabled}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MoreHorizontal className="h-5 w-5 text-gray-500" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                {getAvailableActions().map((action) => (
                  <button
                    key={action.status}
                    onClick={() => handleStatusUpdate(action.status)}
                    disabled={isDisabled}
                    className={`w-full text-left px-4 py-2 text-sm ${action.className} disabled:opacity-50`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <StatusBadge status={project.status} />
        {updating && (
          <span className="ml-2 text-xs text-gray-500">Updating...</span>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-2 text-sm text-gray-500">
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 mr-2" />
          <span>{project.user.name || project.user.email}</span>
        </div>
        
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Created {format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
        </div>
        
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          <span>Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
        </div>

        {project.archivedAt && (
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>Archived {format(new Date(project.archivedAt), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>

      {/* Click overlay to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}