import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/sprints/[id]/status
 *
 * Record a status update for a sprint (used by AI implementation).
 * Creates a SprintReview entry with the status document.
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
    const body = await request.json();
    const { statusDocument, conversationLog, phase: _phase } = body;

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

    // Create a sprint review entry
    const review = await prisma.sprintReview.create({
      data: {
        sprintId: id,
        statusDocument,
        conversationLog: conversationLog || null,
      },
    });

    // Update sprint's review summary with latest status
    await prisma.sprint.update({
      where: { id },
      data: {
        reviewSummary: statusDocument,
      },
    });

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to record sprint status:', error);
    return NextResponse.json(
      { error: 'Failed to record sprint status' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sprints/[id]/status
 *
 * Get the latest status updates for a sprint.
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
          select: { id: true, ownerId: true, implementerId: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
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
      sprintId: sprint.id,
      sprintNumber: sprint.number,
      status: sprint.status,
      reviewSummary: sprint.reviewSummary,
      updates: sprint.reviews.map((r) => ({
        id: r.id,
        statusDocument: r.statusDocument,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to get sprint status:', error);
    return NextResponse.json(
      { error: 'Failed to get sprint status' },
      { status: 500 }
    );
  }
}
