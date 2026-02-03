import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Inngest } from 'inngest';

// Initialize Inngest client for sending events
const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/projects/[id]/reinitiate
 *
 * Re-emit the kickoff event for a project that was kicked off but
 * never triggered the Inngest workflow (e.g., before Inngest was configured).
 * This allows projects to be initiated without resetting their state.
 * Optionally assigns an implementer who can view project documents.
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

    // Parse optional implementerId from request body
    const body = await request.json().catch(() => ({}));
    const { implementerId } = body;

    // Get project with all required data
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        artifacts: true,
        sprints: { orderBy: { number: 'asc' } },
        client: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Project should be IN_PROGRESS or have been kicked off
    if (project.status !== 'IN_PROGRESS' && project.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Project status is ${project.status}. Only IN_PROGRESS or ACTIVE projects can be reinitiated.` },
        { status: 400 }
      );
    }

    // Find the active sprint (or first sprint if none active)
    const activeSprint = project.sprints.find(s => s.status === 'IN_PROGRESS')
      || project.sprints.find(s => s.status === 'ACTIVE')
      || project.sprints[0];

    if (!activeSprint) {
      return NextResponse.json(
        { error: 'No sprints found for this project' },
        { status: 400 }
      );
    }

    // Get handoff document
    const handoffArtifact = project.artifacts.find(a => a.type === 'HANDOFF');
    if (!handoffArtifact) {
      return NextResponse.json(
        { error: 'No handoff document found. Project may not have been properly kicked off.' },
        { status: 400 }
      );
    }

    // Validate and assign implementer if provided
    let implementer = null;
    if (implementerId) {
      implementer = await prisma.user.findUnique({
        where: { id: implementerId },
        select: { id: true, name: true, email: true },
      });

      if (!implementer) {
        return NextResponse.json(
          { error: 'Implementer user not found' },
          { status: 400 }
        );
      }

      // Update project with new implementer
      await prisma.project.update({
        where: { id },
        data: { implementerId },
      });
    }

    // Determine project path
    const targetCodebase = (project as { targetCodebase?: string }).targetCodebase;
    const projectPath = targetCodebase
      ? `C:\\tpml-ai-team\\projects\\${targetCodebase}`
      : `C:\\tpml-ai-team\\projects\\${project.slug}`;

    // Emit the kickoff event
    try {
      await inngest.send({
        name: 'project/kicked_off',
        data: {
          projectId: project.id,
          projectName: project.name,
          projectSlug: project.slug,
          clientName: project.client.name,
          sprintId: activeSprint.id,
          sprintNumber: activeSprint.number,
          sprintName: activeSprint.name || `Sprint ${activeSprint.number}`,
          handoffContent: handoffArtifact.content,
          projectPath,
          reinitiated: true, // Flag to indicate this is a reinitiation
        },
      });
      console.log(`[Reinitiate] Sent project/kicked_off event for ${project.name}`);
    } catch (err) {
      console.error('[Reinitiate] Failed to send Inngest event:', err);
      return NextResponse.json(
        { error: 'Failed to send Inngest event', details: String(err) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" reinitiated`,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        implementerId: implementerId || project.implementerId || null,
        implementer: implementer,
      },
      sprint: {
        id: activeSprint.id,
        number: activeSprint.number,
        name: activeSprint.name,
        status: activeSprint.status,
      },
      projectPath,
      eventSent: 'project/kicked_off',
    });
  } catch (error) {
    console.error('Reinitiate failed:', error);
    return NextResponse.json(
      { error: 'Failed to reinitiate project' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/reinitiate
 *
 * Check if a project can be reinitiated and return its current state.
 */
export async function GET(
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
        artifacts: { select: { type: true, name: true } },
        sprints: { orderBy: { number: 'asc' }, select: { id: true, number: true, name: true, status: true } },
        client: { select: { name: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasHandoff = project.artifacts.some(a => a.type === 'HANDOFF');
    const activeSprint = project.sprints.find(s => s.status === 'IN_PROGRESS' || s.status === 'ACTIVE');
    const canReinitiate = (project.status === 'IN_PROGRESS' || project.status === 'ACTIVE') && hasHandoff;

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      clientName: project.client.name,
      hasHandoff,
      activeSprint: activeSprint || null,
      sprints: project.sprints,
      canReinitiate,
      reason: !canReinitiate
        ? !hasHandoff
          ? 'No handoff document found'
          : `Project status is ${project.status}`
        : null,
    });
  } catch (error) {
    console.error('Failed to check reinitiate status:', error);
    return NextResponse.json(
      { error: 'Failed to check reinitiate status' },
      { status: 500 }
    );
  }
}
