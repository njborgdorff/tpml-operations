import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ProjectStatus } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find project and verify ownership
    const project = await db.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const oldStatus = project.status;

    // Update project status
    const updatedProject = await db.project.update({
      where: { id: params.id },
      data: {
        status,
        archivedAt: status === ProjectStatus.FINISHED ? new Date() : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create status history entry
    await db.projectStatusHistory.create({
      data: {
        projectId: project.id,
        oldStatus,
        newStatus: status,
        changedBy: user.id,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}