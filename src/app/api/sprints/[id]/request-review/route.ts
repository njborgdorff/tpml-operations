import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Inngest } from 'inngest';

const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/sprints/[id]/request-review
 *
 * Request AI review of the sprint implementation.
 * Triggers Reviewer and QA bots via Slack.
 *
 * Optional body:
 *   - commitUrl: URL to the commit/PR to review
 *   - notes: Any notes for the reviewers
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { commitUrl, notes } = body;

    // Get sprint with project
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: true,
            artifacts: true,
          },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    const project = sprint.project;

    // Check access
    if (project.ownerId !== session.user.id && project.implementerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sprint must be in progress to request review
    if (sprint.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: `Cannot request review for sprint with status: ${sprint.status}` },
        { status: 400 }
      );
    }

    // Update sprint status to REVIEW
    await prisma.sprint.update({
      where: { id },
      data: { status: 'REVIEW' },
    });

    // Get handoff content for context
    const handoffArtifact = project.artifacts.find(a => a.type === 'HANDOFF');
    const backlogArtifact = project.artifacts.find(a => a.type === 'BACKLOG');

    // Get project type and target codebase
    const projectType = (project as { projectType?: string }).projectType || 'NEW_PROJECT';
    const targetCodebase = (project as { targetCodebase?: string }).targetCodebase;

    // Trigger review workflow via Inngest
    await inngest.send({
      name: 'sprint/review.requested',
      data: {
        sprintId: sprint.id,
        sprintNumber: sprint.number,
        sprintName: sprint.name,
        sprintGoal: sprint.goal,
        projectId: project.id,
        projectName: project.name,
        projectSlug: project.slug,
        clientName: project.client.name,
        projectType,
        targetCodebase,
        handoffContent: handoffArtifact?.content || null,
        backlogContent: backlogArtifact?.content || null,
        commitUrl: commitUrl || null,
        reviewNotes: notes || null,
        requestedBy: session.user.name || session.user.email,
      },
    });

    console.log(`[Review] Requested review for ${project.name} Sprint ${sprint.number}`);

    return NextResponse.json({
      success: true,
      message: 'Review requested. Reviewer and QA will analyze in Slack.',
      sprint: {
        id: sprint.id,
        number: sprint.number,
        status: 'REVIEW',
      },
    });
  } catch (error) {
    console.error('Failed to request review:', error);
    return NextResponse.json(
      { error: 'Failed to request review' },
      { status: 500 }
    );
  }
}
