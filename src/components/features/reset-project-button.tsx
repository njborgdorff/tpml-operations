'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RotateCcw, Loader2 } from 'lucide-react';

interface ResetProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function ResetProjectButton({ projectId, projectName: _projectName }: ResetProjectButtonProps) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleReset = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/reset`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Reset failed');
      }

      toast.success('Project reset successfully', {
        description: `${data.details.sprintsReset} sprints reset to PLANNED`,
      });

      setConfirmed(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancel = () => {
    setConfirmed(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={confirmed ? 'destructive' : 'outline'}
        onClick={handleReset}
        disabled={isResetting}
      >
        {isResetting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Resetting...
          </>
        ) : confirmed ? (
          <>
            <RotateCcw className="h-4 w-4 mr-2" />
            Confirm Reset
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset for Re-testing
          </>
        )}
      </Button>
      {confirmed && !isResetting && (
        <Button variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      )}
      {confirmed && (
        <span className="text-sm text-muted-foreground">
          This will reset all sprints to PLANNED and clear workflow history
        </span>
      )}
    </div>
  );
}
