'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratePlanButtonProps {
  projectId: string;
  projectSlug: string;
}

export function GeneratePlanButton({ projectId, projectSlug }: GeneratePlanButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGeneratePlan = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/generate-plan`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate plan');
      }

      toast.success('Plan generated! Redirecting to review...');
      router.push(`/projects/${projectSlug}/review`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate plan');
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGeneratePlan}
      disabled={isGenerating}
      size="lg"
      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          AI Team Working...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Plan with AI Team
        </>
      )}
    </Button>
  );
}
