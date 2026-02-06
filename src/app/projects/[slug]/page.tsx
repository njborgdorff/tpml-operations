import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { SprintManager } from '@/components/features/sprint-manager';
import { GeneratePlanButton } from '@/components/features/generate-plan-button';
import { DeleteProjectButton } from '@/components/features/delete-project-button';
import { ReinitiateButton } from '@/components/features/reinitiate-button';
import { ResetProjectButton } from '@/components/features/reset-project-button';
import { ArchiveProjectButton } from '@/components/features/archive-project-button';
import { RestoreProjectButton } from '@/components/features/restore-project-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, CheckCircle, Clock, XCircle, GitBranch } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const statusColors: Record<string, string> = {
  INTAKE: 'bg-yellow-100 text-yellow-800',
  PLANNING: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const approvalIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4" />,
  REJECTED: <XCircle className="h-4 w-4" />,
  REVISION_REQUESTED: <Eye className="h-4 w-4" />,
};

export default async function ProjectPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const { slug } = await params;

  const project = await prisma.project.findFirst({
    where: {
      slug,
      OR: [
        { ownerId: session.user.id },
        { implementerId: session.user.id },
      ],
    },
    include: {
      client: true,
      sprints: {
        orderBy: { number: 'asc' },
      },
      artifacts: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // If project is pending review, redirect to review page
  if (project.status === 'REVIEW' && project.approvalStatus === 'PENDING') {
    redirect(`/projects/${slug}/review`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">
              Client: {project.client.name}
            </p>
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1"
              >
                <GitBranch className="h-4 w-4" />
                {project.repositoryUrl.replace('https://github.com/', '')}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[project.status] || 'bg-gray-100'}>
              {project.status}
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1"
            >
              {approvalIcons[project.approvalStatus]}
              {project.approvalStatus}
            </Badge>
            {project.status === 'FINISHED' ? (
              <RestoreProjectButton
                projectId={project.id}
                projectName={project.name}
              />
            ) : (
              <ArchiveProjectButton
                projectId={project.id}
                projectName={project.name}
              />
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {project.summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
            <CardDescription>
              AI-generated plan approved on{' '}
              {project.approvedAt
                ? new Date(project.approvedAt).toLocaleDateString()
                : 'pending'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(project.summary),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Owner Decisions */}
      {project.approvalNotes && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Owner Decisions</CardTitle>
            <CardDescription>
              Your answers to the decision questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">
              {project.approvalNotes}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Sprint Manager */}
      <SprintManager
        project={{
          id: project.id,
          name: project.name,
          slug: project.slug,
          status: project.status,
          approvalStatus: project.approvalStatus,
        }}
        sprints={project.sprints.map((s) => ({
          id: s.id,
          number: s.number,
          name: s.name,
          goal: s.goal,
          status: s.status,
          startedAt: s.startedAt?.toISOString() || null,
          completedAt: s.completedAt?.toISOString() || null,
          reviewSummary: (s as { reviewSummary?: string | null }).reviewSummary ?? null,
          devServerUrl: (s as { devServerUrl?: string | null }).devServerUrl ?? null,
          handoffContent: (s as { handoffContent?: string | null }).handoffContent ?? null,
        }))}
        artifacts={project.artifacts.map((a) => ({
          id: a.id,
          type: a.type,
          name: a.name,
          createdAt: a.createdAt.toISOString(),
        }))}
      />

      {/* Generate Plan Button for INTAKE projects */}
      {project.status === 'INTAKE' && (
        <Card className="mt-6 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle>Ready to Start Planning</CardTitle>
            <CardDescription>
              Click below to have the AI team (PM + CTO) analyze your project and generate a development plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GeneratePlanButton projectId={project.id} projectSlug={project.slug} />
          </CardContent>
        </Card>
      )}

      {/* Review Link */}
      {project.status === 'REVIEW' && (
        <div className="mt-6">
          <Link href={`/projects/${slug}/review`}>
            <Button>
              <Eye className="h-4 w-4 mr-2" />
              Review Plan
            </Button>
          </Link>
        </div>
      )}

      {/* Reinitiate Workflow for stalled projects */}
      {(project.status === 'IN_PROGRESS' || project.status === 'ACTIVE') && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle>Workflow Not Started?</CardTitle>
            <CardDescription>
              If the AI team workflow didn&apos;t start after kickoff, you can reinitiate it here.
              This will re-send the kickoff event without resetting any project data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReinitiateButton
              projectId={project.id}
              projectName={project.name}
            />
          </CardContent>
        </Card>
      )}

      {/* Testing Tools */}
      <Card className="mt-6 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800">Testing Tools</CardTitle>
          <CardDescription>
            Reset the project to re-run the AI workflow from the beginning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetProjectButton
            projectId={project.id}
            projectName={project.name}
          />
        </CardContent>
      </Card>

      {/* Danger Zone - Delete Project */}
      <Card className="mt-8 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteProjectButton
            projectId={project.id}
            projectName={project.name}
            hasTargetCodebase={!!project.targetCodebase}
          />
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
