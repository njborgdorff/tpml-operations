'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  ExternalLink,
} from 'lucide-react';

interface Sprint {
  id: string;
  number: number;
  name: string | null;
  goal: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface Artifact {
  id: string;
  type: string;
  name: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
  approvalStatus: string;
}

interface SprintManagerProps {
  project: Project;
  sprints: Sprint[];
  artifacts: Artifact[];
}

const statusColors: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  PLANNED: <Clock className="h-4 w-4" />,
  IN_PROGRESS: <Loader2 className="h-4 w-4 animate-spin" />,
  COMPLETED: <CheckCircle className="h-4 w-4" />,
  BLOCKED: <AlertCircle className="h-4 w-4" />,
};

export function SprintManager({ project, sprints, artifacts }: SprintManagerProps) {
  const router = useRouter();
  const [isKicking, setIsKicking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [kickoffResult, setKickoffResult] = useState<{
    success: boolean;
    projectPath: string;
    cliCommand: string;
  } | null>(null);

  const hasHandoff = artifacts.some(a => a.name === 'HANDOFF_CTO_TO_IMPLEMENTER.md');
  const activeSprint = sprints.find(s => s.status === 'IN_PROGRESS');
  const canKickoff = project.approvalStatus === 'APPROVED' && !hasHandoff && !activeSprint;
  const completedSprints = sprints.filter(s => s.status === 'COMPLETED').length;
  const totalSprints = sprints.length;
  const progressPercent = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : 0;

  const handleKickoff = async () => {
    setIsKicking(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/kickoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kickoff failed');
      }

      setKickoffResult({
        success: true,
        projectPath: data.projectPath,
        cliCommand: data.cliCommand,
      });

      toast.success('Implementation started! Sprint 1 is now in progress.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kickoff failed');
    } finally {
      setIsKicking(false);
    }
  };

  const copyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(true);
    toast.success('Command copied to clipboard');
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const openClaudeCLI = () => {
    // Use the tpml:// protocol handler to open Claude CLI
    window.location.href = `tpml://open/${project.slug}`;
    toast.success('Opening Claude CLI...');
  };

  const handleSprintUpdate = async (sprintId: string, status: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }

      toast.success(`Sprint ${status === 'COMPLETED' ? 'completed' : 'updated'}!`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  // CLI command for this project
  const cliCommand = `cd "C:\\tpml-ai-team\\projects\\${project.slug}" && claude`;

  return (
    <div className="space-y-6">
      {/* Kickoff Section - Show when approved but not started */}
      {canKickoff && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Ready to Start Implementation
            </CardTitle>
            <CardDescription>
              Your project is approved. Click below to start Sprint 1 and generate the implementation handoff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleKickoff}
              disabled={isKicking}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isKicking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Implementation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Kickoff Result - Show CLI button after kickoff */}
      {kickoffResult?.success && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-blue-600" />
              Implementation Started
            </CardTitle>
            <CardDescription>
              Sprint 1 is now in progress. Click below to open Claude CLI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={openClaudeCLI}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Claude CLI
            </Button>
            <p className="text-sm text-muted-foreground">
              The handoff document has been created. Claude will read it automatically when you start.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Or copy command manually
              </summary>
              <div className="mt-2 bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                <code>{kickoffResult.cliCommand}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => copyCommand(kickoffResult.cliCommand)}
                >
                  {copiedCommand ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Active Sprint with CLI Button */}
      {activeSprint && !kickoffResult && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  Sprint {activeSprint.number}: {activeSprint.name || 'In Progress'}
                </CardTitle>
                <CardDescription>{activeSprint.goal}</CardDescription>
              </div>
              <Badge className={statusColors[activeSprint.status]}>
                {activeSprint.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSprint.startedAt && (
              <p className="text-sm text-muted-foreground">
                Started: {new Date(activeSprint.startedAt).toLocaleDateString()}
              </p>
            )}

            {/* Open CLI Button */}
            <Button
              onClick={openClaudeCLI}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Claude CLI
            </Button>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.refresh()}
                disabled={isUpdating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => handleSprintUpdate(activeSprint.id, 'COMPLETED')}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Mark Complete
              </Button>
            </div>

            {/* Manual command as fallback */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Or copy command manually
              </summary>
              <div className="mt-2 bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                <code>{cliCommand}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => copyCommand(cliCommand)}
                >
                  {copiedCommand ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      {totalSprints > 0 && completedSprints > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedSprints} of {totalSprints} sprints ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprint List */}
      {sprints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sprint Plan</CardTitle>
            <CardDescription>
              {sprints.length} sprint(s) planned for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    sprint.status === 'IN_PROGRESS'
                      ? 'border-blue-200 bg-blue-50'
                      : sprint.status === 'COMPLETED'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {statusIcons[sprint.status] || <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        Sprint {sprint.number}{sprint.name ? `: ${sprint.name}` : ''}
                      </p>
                      {sprint.goal && (
                        <p className="text-sm text-muted-foreground">{sprint.goal}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={statusColors[sprint.status] || 'bg-gray-100'}>
                    {sprint.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Sprints Message */}
      {sprints.length === 0 && project.approvalStatus === 'APPROVED' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              No sprints defined for this project. Generate a plan first to create sprints.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Artifacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Artifacts
          </CardTitle>
          <CardDescription>
            Generated documents and handoffs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{artifact.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(artifact.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {artifacts.length === 0 && (
              <p className="text-muted-foreground text-sm py-2">
                No artifacts generated yet. Approve the project to generate artifacts.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
