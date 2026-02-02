import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { SprintStatus } from '@prisma/client';
import { syncKnowledgeBase } from '@/lib/knowledge/sync';

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
          select: { id: true, name: true, slug: true, ownerId: true },
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

    if (sprint.project.ownerId !== session.user.id) {
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
    const { status, reviewSummary } = body;

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, ownerId: true },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (sprint.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update data
    const updateData: {
      status?: SprintStatus;
      reviewSummary?: string;
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

    const updatedSprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
    });

    // If sprint completed, check if we should start the next sprint
    if (status === 'COMPLETED') {
      const nextSprint = await prisma.sprint.findFirst({
        where: {
          projectId: sprint.projectId,
          number: sprint.number + 1,
        },
      });

      if (nextSprint) {
        // Auto-start next sprint
        await prisma.sprint.update({
          where: { id: nextSprint.id },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        });
      } else {
        // No more sprints - mark project as completed
        await prisma.project.update({
          where: { id: sprint.projectId },
          data: { status: 'COMPLETED' },
        });
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
