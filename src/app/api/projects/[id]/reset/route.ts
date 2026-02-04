import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/projects/[id]/reset
 * Reset a project for re-testing:
 * - Resets all sprints to PLANNED status
 * - Clears sprint artifacts
 * - Keeps the project plan and backlog intact
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

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      include: {
        sprints: true,
        artifacts: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Reset all sprints to PLANNED
    await prisma.sprint.updateMany({
      where: { projectId: id },
      data: {
        status: 'PLANNED',
        startedAt: null,
        completedAt: null,
        reviewSummary: null,
      },
    });

    // Delete implementation artifacts (keep BACKLOG and ARCHITECTURE)
    await prisma.artifact.deleteMany({
      where: {
        projectId: id,
        type: {
          in: ['SPRINT_STATUS', 'HANDOFF', 'HANDOFF_CTO_TO_IMPLEMENTER'],
        },
      },
    });

    // Delete conversations (workflow history)
    await prisma.conversation.deleteMany({
      where: { projectId: id },
    });

    // Reset project status to APPROVED (ready for kickoff)
    await prisma.project.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project reset successfully',
      details: {
        sprintsReset: project.sprints.length,
        artifactsKept: project.artifacts.filter(a =>
          a.type === 'BACKLOG' || a.type === 'ARCHITECTURE'
        ).length,
        artifactsDeleted: project.artifacts.filter(a =>
          a.type !== 'BACKLOG' && a.type !== 'ARCHITECTURE'
        ).length,
      },
    });
  } catch (error) {
    console.error('Reset project error:', error);
    return NextResponse.json(
      { error: 'Failed to reset project' },
      { status: 500 }
    );
  }
}
