'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
  hasTargetCodebase: boolean;
}

export function DeleteProjectButton({
  projectId,
  projectName,
  hasTargetCodebase,
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteFolder, setDeleteFolder] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const url = `/api/projects/${projectId}${deleteFolder ? '?deleteFolder=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete project');
      }

      toast.success(`Project "${projectName}" deleted successfully`);
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg space-y-4">
        <p className="text-sm font-medium text-red-800">
          Are you sure you want to delete &quot;{projectName}&quot;?
        </p>
        <p className="text-sm text-red-600">
          This will permanently delete the project, all sprints, artifacts, and conversations.
        </p>

        {!hasTargetCodebase && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={deleteFolder}
              onChange={(e) => setDeleteFolder(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-700">
              Also delete the project folder from disk
            </span>
          </label>
        )}

        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Yes, Delete
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={() => setShowConfirm(true)}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete Project
    </Button>
  );
}
