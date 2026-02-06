'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Globe,
  Pencil,
  FileCheck,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Rocket,
} from 'lucide-react';

interface Sprint {
  id: string;
  number: number;
  name: string | null;
  goal: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  reviewSummary: string | null;
  devServerUrl: string | null;
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
  REVIEW: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
  AWAITING_APPROVAL: 'bg-amber-100 text-amber-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  PLANNED: <Clock className="h-4 w-4" />,
  IN_PROGRESS: <Loader2 className="h-4 w-4 animate-spin" />,
  REVIEW: <FileCheck className="h-4 w-4" />,
  COMPLETED: <CheckCircle className="h-4 w-4" />,
  BLOCKED: <AlertCircle className="h-4 w-4" />,
  AWAITING_APPROVAL: <UserCheck className="h-4 w-4" />,
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
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [editingDevUrl, setEditingDevUrl] = useState<string | null>(null);
  const [devUrlInput, setDevUrlInput] = useState('');
  const [handoffContent, setHandoffContent] = useState<string | null>(null);

  const hasHandoff = artifacts.some(a => a.name === 'HANDOFF_CTO_TO_IMPLEMENTER.md');
  const activeSprint = sprints.find(s => s.status === 'IN_PROGRESS' || s.status === 'REVIEW');
  const canKickoff = project.approvalStatus === 'APPROVED' && !hasHandoff && !activeSprint;
  const completedSprints = sprints.filter(s => s.status === 'COMPLETED').length;
  const totalSprints = sprints.length;
  const progressPercent = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : 0;

  // Fetch handoff content when project has been kicked off
  useEffect(() => {
    if (hasHandoff) {
      fetch(`/api/projects/${project.id}/kickoff`)
        .then(res => res.json())
        .then(data => {
          if (data.handoffContent) {
            setHandoffContent(data.handoffContent);
          }
        })
        .catch(() => {});
    }
  }, [hasHandoff, project.id]);

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
      if (data.handoffContent) {
        setHandoffContent(data.handoffContent);
      }

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

  const toggleSprintExpanded = (sprintId: string) => {
    setExpandedSprints((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(sprintId)) {
        newSet.delete(sprintId);
      } else {
        newSet.add(sprintId);
      }
      return newSet;
    });
  };

  const handleDevUrlUpdate = async (sprintId: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devServerUrl: devUrlInput || null }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }

      toast.success('Dev server URL updated!');
      setEditingDevUrl(null);
      setDevUrlInput('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  // Approve sprint and trigger workflow (calls the approve endpoint)
  const handleSprintApprove = async (sprintId: string, sprintNumber: number) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Approval failed');
      }

      toast.success(`Sprint ${sprintNumber} approved! AI workflow starting...`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Approval failed');
    } finally {
      setIsUpdating(false);
    }
  };

  // QA Verification - confirm testing passed or report issues
  const [isVerifyingQa, setIsVerifyingQa] = useState(false);
  const [showIssuesForm, setShowIssuesForm] = useState(false);
  const [qaIssues, setQaIssues] = useState('');

  const handleQaVerification = async (verified: boolean, issues?: string) => {
    if (!activeSprint) return;

    setIsVerifyingQa(true);
    try {
      const response = await fetch('/api/workflow/qa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sprintNumber: activeSprint.number,
          verified,
          issuesFound: issues || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'QA verification failed');
      }

      if (verified) {
        toast.success('QA Verified! Workflow will continue to deployment prep.');
      } else {
        toast.success('Issues reported. Workflow will loop back for fixes.');
      }

      setShowIssuesForm(false);
      setQaIssues('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'QA verification failed');
    } finally {
      setIsVerifyingQa(false);
    }
  };

  // Deploy handler - triggers deployment of pending changes
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<{
    success: boolean;
    method: string;
    message: string;
    dashboardUrl?: string;
    productionUrl?: string;
    tips?: string[];
    manualSteps?: string[];
    timestamp?: number;
  } | null>(null);

  // Load deployment result from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`deploy-status-${project.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only restore if less than 1 hour old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          setDeploymentResult(parsed);
        } else {
          localStorage.removeItem(`deploy-status-${project.id}`);
        }
      } catch {
        localStorage.removeItem(`deploy-status-${project.id}`);
      }
    }
  }, [project.id]);

  // Save deployment result to localStorage when it changes
  useEffect(() => {
    if (deploymentResult) {
      localStorage.setItem(`deploy-status-${project.id}`, JSON.stringify(deploymentResult));
    }
  }, [deploymentResult, project.id]);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentResult(null);
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.manualSteps) {
          setDeploymentResult({
            success: false,
            method: 'manual',
            message: 'Deployment not configured',
            manualSteps: data.manualSteps,
          });
          toast.error('Deployment not configured', {
            description: 'See manual steps below',
          });
        } else {
          throw new Error(data.error || 'Deployment failed');
        }
        return;
      }

      setDeploymentResult({
        success: true,
        method: data.method,
        message: data.message,
        dashboardUrl: data.dashboardUrl,
        productionUrl: data.productionUrl,
        tips: data.tips,
        timestamp: Date.now(),
      });

      toast.success(`Deployment triggered via ${data.method}`, {
        description: data.message,
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Deployment failed');
      setDeploymentResult(null);
    } finally {
      setIsDeploying(false);
    }
  };

  const clearDeploymentResult = () => {
    setDeploymentResult(null);
    localStorage.removeItem(`deploy-status-${project.id}`);
  };

  const completedSprintsList = sprints.filter(s => s.status === 'COMPLETED');
  const sprintAwaitingApproval = sprints.find(s => s.status === 'AWAITING_APPROVAL');
  const hasCompletedSprints = completedSprintsList.length > 0;

  return (
    <div className="space-y-6">
      {/* Deploy Button - Always visible for quick deployment */}
      <Card className={`border-orange-200 ${deploymentResult?.success ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-orange-50 to-amber-50'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className={`h-5 w-5 ${deploymentResult?.success ? 'text-green-600' : 'text-orange-600'}`} />
              <div>
                <p className="font-medium">
                  {deploymentResult?.success ? 'Deployment In Progress' : 'Deploy Changes'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deploymentResult?.message || 'Push pending code changes to production'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleDeploy}
              disabled={isDeploying}
              className={deploymentResult?.success ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deploying...
                </>
              ) : deploymentResult?.success ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Redeploy
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy Now
                </>
              )}
            </Button>
          </div>

          {/* Deployment Status Details */}
          {deploymentResult && (
            <div className="mt-4 pt-4 border-t border-orange-200">
              {deploymentResult.success ? (
                <div className="space-y-3">
                  {/* Action Links */}
                  <div className="flex flex-wrap gap-3">
                    {deploymentResult.dashboardUrl && (
                      <a
                        href={deploymentResult.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Build Status
                      </a>
                    )}
                    {deploymentResult.productionUrl && (
                      <a
                        href={deploymentResult.productionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        Open Production Site
                      </a>
                    )}
                  </div>

                  {/* Tips */}
                  {deploymentResult.tips && deploymentResult.tips.length > 0 && (
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">What to expect:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {deploymentResult.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDeploymentResult}
                    className="text-gray-500"
                  >
                    Dismiss
                  </Button>
                </div>
              ) : deploymentResult.manualSteps ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-amber-800">Manual deployment required:</p>
                  <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                    {deploymentResult.manualSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDeploymentResult}
                    className="text-gray-500"
                  >
                    Dismiss
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

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
            <p className="text-sm text-muted-foreground">
              The handoff document has been created. Copy the prompt below and paste it into Claude.
            </p>
            <Button
              onClick={() => handoffContent && copyCommand(handoffContent)}
              disabled={!handoffContent}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {copiedCommand ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedCommand ? 'Copied!' : 'Copy Prompt'}
            </Button>
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

            {/* Copy Prompt */}
            <Button
              onClick={() => handoffContent && copyCommand(handoffContent)}
              disabled={!handoffContent}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {copiedCommand ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedCommand ? 'Copied!' : 'Copy Prompt'}
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

            {/* Copy Prompt fallback */}
            {handoffContent && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Copy implementation prompt
                </summary>
                <div className="mt-2">
                  <Button
                    onClick={() => copyCommand(handoffContent)}
                    size="sm"
                    variant="outline"
                  >
                    {copiedCommand ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copiedCommand ? 'Copied!' : 'Copy Prompt'}
                  </Button>
                </div>
              </details>
            )}

            {/* QA Verification Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-purple-600" />
                QA Verification
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                After testing the implementation, confirm results:
              </p>

              {!showIssuesForm ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleQaVerification(true)}
                    disabled={isVerifyingQa}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isVerifyingQa ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    QA Verified
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowIssuesForm(true)}
                    disabled={isVerifyingQa}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Issues Found
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    className="w-full p-3 border rounded-lg text-sm"
                    rows={4}
                    placeholder="Describe the issues found during testing..."
                    value={qaIssues}
                    onChange={(e) => setQaIssues(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleQaVerification(false, qaIssues)}
                      disabled={isVerifyingQa || !qaIssues.trim()}
                    >
                      {isVerifyingQa ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      Submit Issues
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowIssuesForm(false);
                        setQaIssues('');
                      }}
                      disabled={isVerifyingQa}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {activeSprint.devServerUrl && (
                <div className="mt-3">
                  <a
                    href={activeSprint.devServerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-4 w-4" />
                    Open Dev Server
                  </a>
                </div>
              )}
            </div>
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

      {/* Sprint Awaiting Approval */}
      {sprintAwaitingApproval && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-600" />
              Sprint {sprintAwaitingApproval.number} Ready for Review
            </CardTitle>
            <CardDescription>
              The previous sprint has been completed. Review the work and approve to start the next sprint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-white border border-amber-200">
              <p className="font-medium">
                Sprint {sprintAwaitingApproval.number}{sprintAwaitingApproval.name ? `: ${sprintAwaitingApproval.name}` : ''}
              </p>
              {sprintAwaitingApproval.goal && (
                <p className="text-sm text-muted-foreground mt-1">{sprintAwaitingApproval.goal}</p>
              )}
            </div>
            <Button
              onClick={() => handleSprintApprove(sprintAwaitingApproval.id, sprintAwaitingApproval.number)}
              disabled={isUpdating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting workflow...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Approve &amp; Start Sprint {sprintAwaitingApproval.number}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed Sprints with Reports */}
      {hasCompletedSprints && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              Completed Sprint Reports
            </CardTitle>
            <CardDescription>
              Review completed sprints and test the delivered features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedSprintsList.map((sprint) => {
                const isExpanded = expandedSprints.has(sprint.id);
                const isEditingUrl = editingDevUrl === sprint.id;

                return (
                  <div
                    key={sprint.id}
                    className="rounded-lg border border-green-200 bg-green-50 overflow-hidden"
                  >
                    {/* Sprint Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => toggleSprintExpanded(sprint.id)}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">
                            Sprint {sprint.number}{sprint.name ? `: ${sprint.name}` : ''}
                          </p>
                          {sprint.completedAt && (
                            <p className="text-sm text-muted-foreground">
                              Completed {new Date(sprint.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sprint.devServerUrl && (
                          <a
                            href={sprint.devServerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Globe className="h-5 w-5" />
                          </a>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-green-200 p-4 bg-white space-y-4">
                        {/* Review Summary */}
                        {sprint.reviewSummary ? (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Sprint Report
                            </h4>
                            <div className="prose prose-sm max-w-none bg-gray-50 p-3 rounded-lg">
                              <pre className="whitespace-pre-wrap text-sm font-sans">
                                {sprint.reviewSummary}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No sprint report available yet.
                          </p>
                        )}

                        {/* Dev Server URL */}
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Test/Preview URL
                          </h4>
                          {isEditingUrl ? (
                            <div className="flex gap-2">
                              <Input
                                type="url"
                                placeholder="https://dev.example.com/..."
                                value={devUrlInput}
                                onChange={(e) => setDevUrlInput(e.target.value)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleDevUrlUpdate(sprint.id)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingDevUrl(null);
                                  setDevUrlInput('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : sprint.devServerUrl ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={sprint.devServerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-4 w-4" />
                                {sprint.devServerUrl}
                              </a>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingDevUrl(sprint.id);
                                  setDevUrlInput(sprint.devServerUrl || '');
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingDevUrl(sprint.id);
                                setDevUrlInput('');
                              }}
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Add preview URL
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
