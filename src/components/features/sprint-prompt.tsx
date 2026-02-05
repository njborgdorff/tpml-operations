'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Copy,
  Check,
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Zap,
} from 'lucide-react';

interface SprintPromptProps {
  sprintId: string;
  sprintNumber: number;
  sprintName?: string;
  projectName: string;
  isActive: boolean; // Whether this sprint is the current one to work on
}

interface PromptData {
  prompt: string;
  cliCommand: string;
  workingDirectory: string;
  instructions: string[];
  projectType: string;
  format: string;
}

export function SprintPrompt({
  sprintId,
  sprintNumber,
  sprintName,
  projectName: _projectName,
  isActive,
}: SprintPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [format, setFormat] = useState<'full' | 'quick'>('full');

  const fetchPrompt = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/prompt?format=${format}`);
      if (!response.ok) {
        throw new Error('Failed to load prompt');
      }
      const data = await response.json();
      setPromptData(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load prompt');
    } finally {
      setIsLoading(false);
    }
  }, [sprintId, format]);

  // Fetch prompt when expanded for the first time
  useEffect(() => {
    if (isExpanded && !promptData) {
      fetchPrompt();
    }
  }, [isExpanded, promptData, fetchPrompt]);

  // Refetch when format changes (only if already expanded)
  useEffect(() => {
    if (isExpanded && promptData) {
      fetchPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  const copyToClipboard = async (text: string, type: 'prompt' | 'command') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'prompt') {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
        toast.success('Prompt copied to clipboard');
      } else {
        setCopiedCommand(true);
        setTimeout(() => setCopiedCommand(false), 2000);
        toast.success('Command copied to clipboard');
      }
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!isActive) {
    return null; // Don't show prompt for non-active sprints
  }

  return (
    <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle className="text-lg">
                Claude Code Prompt - Sprint {sprintNumber}
                {sprintName && `: ${sprintName}`}
              </CardTitle>
              <CardDescription>
                Copy this prompt and paste it into Claude Code for implementation
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-muted-foreground">Loading prompt...</span>
            </div>
          ) : promptData ? (
            <>
              {/* Instructions */}
              <div className="bg-white/60 rounded-lg p-4 border border-indigo-100">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  How to Use
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  {promptData.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
              </div>

              {/* Format Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Prompt format:</span>
                <Button
                  variant={format === 'full' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat('full')}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Full
                </Button>
                <Button
                  variant={format === 'quick' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat('quick')}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Quick
                </Button>
              </div>

              {/* CLI Command */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Step 1: Open Terminal</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(promptData.cliCommand, 'command')}
                  >
                    {copiedCommand ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Command
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm overflow-x-auto">
                  {promptData.cliCommand}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Step 2: Paste This Prompt</label>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => copyToClipboard(promptData.prompt, 'prompt')}
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Prompt
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="p-4 text-sm whitespace-pre-wrap font-mono text-gray-700">
                    {promptData.prompt}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format === 'full'
                    ? 'Full prompt includes complete backlog and architecture for context.'
                    : 'Quick prompt is shorter - use when Claude already has context.'}
                </p>
              </div>

              {/* Working Directory Info */}
              <div className="text-xs text-muted-foreground bg-white/60 p-2 rounded">
                <strong>Working Directory:</strong> {promptData.workingDirectory}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Failed to load prompt. Click to retry.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
