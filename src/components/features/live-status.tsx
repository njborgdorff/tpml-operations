'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Terminal,
  Pause,
  Play,
} from 'lucide-react';

interface StatusUpdate {
  id: string;
  role: string;
  status: string;
  details: Record<string, unknown>;
  timestamp: string;
}

interface LiveStatusProps {
  projectId: string;
  initialUpdates?: StatusUpdate[];
}

const statusIcons: Record<string, React.ReactNode> = {
  creating_handoff: <Terminal className="h-4 w-4" />,
  preparing_prompt: <Terminal className="h-4 w-4" />,
  invoking_claude: <Loader2 className="h-4 w-4 animate-spin" />,
  claude_output: <Activity className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
};

const statusLabels: Record<string, string> = {
  creating_handoff: 'Creating handoff document',
  preparing_prompt: 'Preparing implementation prompt',
  invoking_claude: 'Claude Code is running',
  claude_output: 'Processing output',
  completed: 'Implementation completed',
  failed: 'Implementation failed',
  error: 'Error occurred',
};

export function LiveStatus({ projectId, initialUpdates = [] }: LiveStatusProps) {
  const [updates, setUpdates] = useState<StatusUpdate[]>(initialUpdates);
  const [isPolling, setIsPolling] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const url = new URL(`/api/projects/${projectId}/status`, window.location.origin);
      if (lastUpdate) {
        url.searchParams.set('since', lastUpdate);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();

      if (data.updates && data.updates.length > 0) {
        setUpdates((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const newUpdates = data.updates.filter(
            (u: StatusUpdate) => !existingIds.has(u.id)
          );
          return [...newUpdates, ...prev].slice(0, 50); // Keep last 50
        });
        setLastUpdate(data.lastUpdate);
      }

      setIsRunning(data.isRunning);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectId, lastUpdate]);

  useEffect(() => {
    if (!isPolling) return;

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds when running, 10 seconds otherwise
    const interval = setInterval(fetchStatus, isRunning ? 3000 : 10000);

    return () => clearInterval(interval);
  }, [fetchStatus, isPolling, isRunning]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDetails = (details: Record<string, unknown>): string | null => {
    if (!details || Object.keys(details).length === 0) return null;
    if (details.chunk) {
      return String(details.chunk).substring(0, 100) + '...';
    }
    if (details.error) {
      return `Error: ${details.error}`;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
              Live Status
            </CardTitle>
            <CardDescription>
              {isRunning
                ? 'Claude Code is running autonomously'
                : updates.length > 0
                ? 'Last activity: ' + formatTime(updates[0]?.timestamp)
                : 'No recent activity'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
            >
              {isPolling ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No status updates yet. Updates will appear here when Claude Code starts running.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {updates.map((update) => (
              <div
                key={update.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="mt-0.5">
                  {statusIcons[update.status] || (
                    <Activity className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {statusLabels[update.status] || update.status}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {update.role}
                    </Badge>
                  </div>
                  {formatDetails(update.details) && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {formatDetails(update.details)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(update.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
