import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/projects/[id]/status
 *
 * Get real-time status updates for a project.
 * Used for polling during autonomous implementation.
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
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, ownerId: true, implementerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch recent status updates
    const updates = await prisma.conversation.findMany({
      where: {
        projectId: id,
        type: 'status_update',
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        role: true,
        input: true,
        output: true,
        createdAt: true,
      },
    });

    // Get active sprint
    const activeSprint = await prisma.sprint.findFirst({
      where: {
        projectId: id,
        status: 'IN_PROGRESS',
      },
      select: {
        id: true,
        number: true,
        name: true,
        status: true,
        startedAt: true,
      },
    });

    // Check if there's an active implementation running
    // (by looking at recent status updates)
    const recentUpdate = updates[0];
    const isRunning =
      recentUpdate &&
      new Date().getTime() - new Date(recentUpdate.createdAt).getTime() <
        60000; // Within last minute

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      projectStatus: project.status,
      activeSprint,
      isRunning,
      updates: updates.map((u) => ({
        id: u.id,
        role: u.role,
        status: (u.input as { status?: string })?.status || 'unknown',
        details: u.output,
        timestamp: u.createdAt,
      })),
      lastUpdate: recentUpdate?.createdAt || null,
    });
  } catch (error) {
    console.error('Failed to get project status:', error);
    return NextResponse.json(
      { error: 'Failed to get project status' },
      { status: 500 }
    );
  }
}
