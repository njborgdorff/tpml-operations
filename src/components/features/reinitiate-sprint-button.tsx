'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReinitiateSprintButtonProps {
  sprintId: string;
  sprintNumber: number;
  projectName: string;
}

export function ReinitiateSprintButton({
  sprintId,
  sprintNumber,
  projectName,
}: ReinitiateSprintButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReinitiate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/reinitiate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reinitiate sprint');
      }

      setIsSuccess(true);
      toast.success(
        `Sprint ${sprintNumber} reinitiated for "${projectName}"! Check Slack for updates.`,
        { duration: 5000 }
      );

      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reinitiate sprint');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Button variant="outline" size="sm" disabled className="text-green-600">
        <CheckCircle className="h-4 w-4 mr-2" />
        Sprint Reinitiated!
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReinitiate}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Reinitiating Sprint...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reinitiate Sprint {sprintNumber}
        </>
      )}
    </Button>
  );
}
