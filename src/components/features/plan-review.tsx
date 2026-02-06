'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Check, X, RefreshCw, MessageSquare } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
  summary: string | null;
  approvalStatus: string;
  approvalNotes: string | null;
  client: { name: string };
}

interface PlanReviewProps {
  project: Project;
}

// Extract decision questions from summary markdown
function extractDecisions(summary: string | null): string[] {
  if (!summary) return [];

  // Look for "Decisions Needed" section and extract items
  const decisionsMatch = summary.match(/## Decisions Needed[^\n]*\n([\s\S]*?)(?=##|$)/i);
  if (!decisionsMatch) return [];

  const decisionsText = decisionsMatch[1];

  // Match numbered items (1. **Label**: description) or bullet points (- item)
  const numberedItems = decisionsText.match(/^\d+\.\s+\*\*([^*]+)\*\*:\s*(.+)$/gm);
  const bulletItems = decisionsText.match(/^[-*]\s+(.+)$/gm);

  if (numberedItems && numberedItems.length > 0) {
    // Extract the label and description from numbered items
    return numberedItems.map(item => {
      const match = item.match(/^\d+\.\s+\*\*([^*]+)\*\*:\s*(.+)$/);
      if (match) {
        return `${match[1]}: ${match[2]}`;
      }
      return item.replace(/^\d+\.\s+/, '').trim();
    }).filter(b => b.length > 0);
  }

  if (bulletItems && bulletItems.length > 0) {
    return bulletItems.map(b => b.replace(/^[-*]\s+/, '').trim()).filter(b => b.length > 0);
  }

  return [];
}

export function PlanReview({ project: initialProject }: PlanReviewProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [decisionAnswers, setDecisionAnswers] = useState<Record<number, string>>({});

  const decisions = extractDecisions(project.summary);

  const generatePlan = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate-plan`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate plan');
      }

      const data = await response.json();
      setProject(prev => ({
        ...prev,
        status: 'REVIEW',
        summary: data.summary,
      }));
      toast.success('Plan generated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate plan');
      setProject(prev => ({ ...prev, status: 'INTAKE' }));
    } finally {
      setIsGenerating(false);
    }
  }, [project.id]);

  // Auto-generate plan if project is in INTAKE status
  useEffect(() => {
    if (initialProject.status === 'INTAKE') {
      generatePlan();
    }
  }, [initialProject.status, generatePlan]);

  const allDecisionsAnswered = decisions.length === 0 ||
    decisions.every((_, i) => decisionAnswers[i]?.trim());

  const handleApproval = async (action: 'approve' | 'revision' | 'reject') => {
    if (action === 'revision' && !showRevisionInput) {
      setShowRevisionInput(true);
      return;
    }

    setIsApproving(true);
    try {
      // Format decision answers for storage
      const formattedDecisions = decisions.length > 0
        ? decisions.map((q, i) => `Q: ${q}\nA: ${decisionAnswers[i] || 'No answer provided'}`).join('\n\n')
        : undefined;

      const response = await fetch(`/api/projects/${project.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: action === 'revision' ? revisionNotes : formattedDecisions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update approval');
      }

      if (action === 'approve') {
        toast.success('Project approved! Artifacts are being generated.');
        router.push('/');
        router.refresh();
      } else if (action === 'reject') {
        toast.info('Project rejected.');
        router.push('/');
        router.refresh();
      } else {
        toast.info('Revision requested. The AI team will update the plan.');
        // In a full implementation, this would re-trigger planning with the notes
        setShowRevisionInput(false);
        setRevisionNotes('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsApproving(false);
    }
  };

  // Planning in progress
  if (project.status === 'INTAKE' || project.status === 'PLANNING' || isGenerating) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">AI Team is Working</h2>
          <p className="text-muted-foreground mb-4">
            The PM is creating sprints and backlog...
            <br />
            The CTO is designing the architecture...
            <br />
            This usually takes about a minute.
          </p>
          <div className="flex justify-center gap-2 text-sm text-muted-foreground">
            <span className="animate-pulse">Generating plan</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Already approved
  if (project.approvalStatus === 'APPROVED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Project Approved
          </CardTitle>
          <CardDescription>
            {project.name} for {project.client.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(project.summary || '') }} />
          </div>
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              This project has been approved. Implementation can begin.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Review mode
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground">
          Review the plan for {project.client.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
          <CardDescription>
            This is what the AI team proposes to build
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.summary ? (
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(project.summary) }} />
            </div>
          ) : (
            <p className="text-muted-foreground">No summary available.</p>
          )}
        </CardContent>
      </Card>

      {/* Decision Questions — shown immediately when present */}
      {decisions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Decisions Needed
            </CardTitle>
            <CardDescription>
              Answer these questions before approving the plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {decisions.map((question, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`decision-${index}`} className="text-sm font-medium">
                  {index + 1}. {question}
                </Label>
                <Input
                  id={`decision-${index}`}
                  value={decisionAnswers[index] || ''}
                  onChange={(e) => setDecisionAnswers(prev => ({
                    ...prev,
                    [index]: e.target.value
                  }))}
                  placeholder="Your answer..."
                  className="bg-white"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Revision Input */}
      {showRevisionInput && (
        <Card>
          <CardHeader>
            <CardTitle>Request Revision</CardTitle>
            <CardDescription>
              What changes would you like the AI team to make?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Describe what you'd like changed..."
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleApproval('revision')}
                disabled={!revisionNotes.trim() || isApproving}
              >
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Revision Request
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevisionInput(false);
                  setRevisionNotes('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Actions */}
      <Card>
        <CardContent className="py-6">
          {!allDecisionsAnswered && (
            <p className="text-sm text-muted-foreground text-center mb-4">
              Answer all decision questions above to enable approval
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => handleApproval('approve')}
              disabled={isApproving || !allDecisionsAnswered}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Approve Plan
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleApproval('revision')}
              disabled={isApproving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Request Revision
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={() => handleApproval('reject')}
              disabled={isApproving}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>)\n(?!<li)/g, '$1</ul>\n')
    .replace(/(?<!<\/ul>\n)(<li)/g, '<ul class="list-disc mb-4">$1')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/^(?!<[h|u|l|p])/gm, '<p class="mb-4">')
    .replace(/<p class="mb-4"><\/p>/g, '');
}
