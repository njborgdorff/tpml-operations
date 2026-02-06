'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

interface RestoreProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function RestoreProjectButton({ projectId, projectName }: RestoreProjectButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore project');
      }

      toast.success(`"${projectName}" has been moved back to Active`);
      router.push('/projects');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleRestore} disabled={isLoading}>
      <RotateCcw className="h-4 w-4 mr-2" />
      {isLoading ? 'Moving...' : 'Move to Active'}
    </Button>
  );
}
