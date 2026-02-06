import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Inngest } from 'inngest';

const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/projects/[id]/continue-workflow
 *
 * After manual CLI implementation, re-engages the automated AI review and QA workflow.
 * Emits a workflow/continue Inngest event that triggers Code Review → QA → Sprint Completion.
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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sprints: { orderBy: { number: 'asc' } },
        artifacts: true,
        client: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the active IN_PROGRESS sprint
    const activeSprint = project.sprints.find(s => s.status === 'IN_PROGRESS');
    if (!activeSprint) {
      return NextResponse.json(
        { error: 'No active sprint found. A sprint must be IN_PROGRESS to continue the workflow.' },
        { status: 400 }
      );
    }

    // Prefer sprint-level handoff (set after CTO/Architect review for this sprint),
    // fall back to project-level HANDOFF artifact (always Sprint 1's content)
    const handoffArtifact = project.artifacts.find(a => a.type === 'HANDOFF');
    const handoffContent = activeSprint.handoffContent || handoffArtifact?.content || '';

    if (!handoffContent) {
      return NextResponse.json(
        { error: 'No handoff document found. Cannot continue workflow without implementation context.' },
        { status: 400 }
      );
    }

    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Emit the workflow/continue event
    await inngest.send({
      name: 'workflow/continue',
      data: {
        projectId: project.id,
        projectSlug: project.slug,
        projectName: project.name,
        clientName: project.client?.name || 'Client',
        sprintNumber: activeSprint.number,
        sprintName: activeSprint.name || `Sprint ${activeSprint.number}`,
        handoffContent,
        channel,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow re-engaged. Code review and QA are now running.',
      sprint: {
        id: activeSprint.id,
        number: activeSprint.number,
        name: activeSprint.name,
      },
    });
  } catch (error) {
    console.error('Continue workflow failed:', error);
    return NextResponse.json(
      { error: 'Failed to continue workflow' },
      { status: 500 }
    );
  }
}
