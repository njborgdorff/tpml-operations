import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { SprintStatus } from '@prisma/client';
import { syncKnowledgeBase } from '@/lib/knowledge/sync';
import { Inngest } from 'inngest';

// Initialize Inngest client for sending events
const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * GET /api/sprints/[id]
 *
 * Get sprint details including status and progress.
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

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, slug: true, ownerId: true, implementerId: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (!canAccessProject(sprint.project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: sprint.id,
      number: sprint.number,
      name: sprint.name,
      goal: sprint.goal,
      status: sprint.status,
      startedAt: sprint.startedAt,
      completedAt: sprint.completedAt,
      reviewSummary: sprint.reviewSummary,
      handoffContent: sprint.handoffContent,
      project: sprint.project,
      latestReview: sprint.reviews[0] || null,
    });
  } catch (error) {
    console.error('Failed to get sprint:', error);
    return NextResponse.json(
      { error: 'Failed to get sprint' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sprints/[id]
 *
 * Update sprint status and progress.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reviewSummary, devServerUrl } = body;

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, ownerId: true, implementerId: true },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (!canAccessProject(sprint.project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update data
    const updateData: {
      status?: SprintStatus;
      reviewSummary?: string;
      devServerUrl?: string | null;
      startedAt?: Date;
      completedAt?: Date;
    } = {};

    if (status) {
      updateData.status = status as SprintStatus;

      // Set timestamps based on status transitions
      if (status === 'IN_PROGRESS' && !sprint.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === 'COMPLETED' && !sprint.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    if (reviewSummary !== undefined) {
      updateData.reviewSummary = reviewSummary;
    }

    if (devServerUrl !== undefined) {
      updateData.devServerUrl = devServerUrl;
    }

    const updatedSprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
    });

    // If sprint completed, handle next sprint workflow with human-in-the-loop
    if (status === 'COMPLETED') {
      // Fetch project details for event data
      const project = await prisma.project.findUnique({
        where: { id: sprint.projectId },
        include: { client: true },
      });

      const nextSprint = await prisma.sprint.findFirst({
        where: {
          projectId: sprint.projectId,
          number: sprint.number + 1,
        },
      });

      if (nextSprint) {
        // Mark next sprint as awaiting approval (human-in-the-loop)
        await prisma.sprint.update({
          where: { id: nextSprint.id },
          data: { status: 'AWAITING_APPROVAL' },
        });

        // Emit event to request human approval for next sprint
        try {
          await inngest.send({
            name: 'sprint/completed',
            data: {
              projectId: sprint.projectId,
              projectName: project?.name || 'Unknown',
              projectSlug: project?.slug || 'unknown',
              clientName: project?.client.name || 'Unknown',
              completedSprintId: sprint.id,
              completedSprintNumber: sprint.number,
              completedSprintName: sprint.name,
              reviewSummary: updatedSprint.reviewSummary,
              nextSprintId: nextSprint.id,
              nextSprintNumber: nextSprint.number,
              nextSprintName: nextSprint.name,
              nextSprintGoal: nextSprint.goal,
            },
          });
          console.log(`[Sprints] Sent sprint/completed event for ${project?.name} Sprint ${sprint.number}`);
        } catch (err) {
          console.error('[Sprints] Failed to send Inngest event:', err);
        }
      } else {
        // No more sprints - emit project completion event
        await prisma.project.update({
          where: { id: sprint.projectId },
          data: { status: 'COMPLETED' },
        });

        try {
          await inngest.send({
            name: 'project/completed',
            data: {
              projectId: sprint.projectId,
              projectName: project?.name || 'Unknown',
              projectSlug: project?.slug || 'unknown',
              clientName: project?.client.name || 'Unknown',
              finalSprintId: sprint.id,
              finalSprintNumber: sprint.number,
              totalSprints: sprint.number,
            },
          });
          console.log(`[Sprints] Sent project/completed event for ${project?.name}`);
        } catch (err) {
          console.error('[Sprints] Failed to send project/completed event:', err);
        }
      }

      // Sync knowledge base when sprint completes (updates project status)
      syncKnowledgeBase().catch(err => console.error('[Sprints] Knowledge sync failed:', err));
    }

    return NextResponse.json({
      success: true,
      sprint: updatedSprint,
    });
  } catch (error) {
    console.error('Failed to update sprint:', error);
    return NextResponse.json(
      { error: 'Failed to update sprint' },
      { status: 500 }
    );
  }
}
