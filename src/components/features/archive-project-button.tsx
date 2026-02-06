'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArchiveConfirmDialog } from '@/components/ArchiveConfirmDialog';
import { toast } from 'sonner';
import { Archive } from 'lucide-react';

interface ArchiveProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function ArchiveProjectButton({ projectId, projectName }: ArchiveProjectButtonProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINISHED' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive project');
      }

      toast.success(`"${projectName}" has been moved to Finished`);
      setShowDialog(false);
      router.push('/projects');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setShowDialog(true)}>
        <Archive className="h-4 w-4 mr-2" />
        Move to Finished
      </Button>
      <ArchiveConfirmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        projectName={projectName}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  );
}
