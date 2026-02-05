import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ProjectStatus } from '@/types/project';
import { getServerSession } from 'next-auth';

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
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find project and verify ownership
    const existingProject = await db.project.findUnique({
      where: { id: params.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update project status and set archivedAt if moving to FINISHED
    const updateData: any = {
      status,
    };

    if (status === ProjectStatus.FINISHED && existingProject.status !== ProjectStatus.FINISHED) {
      updateData.archivedAt = new Date();
    } else if (status !== ProjectStatus.FINISHED) {
      updateData.archivedAt = null;
    }

    const updatedProject = await db.project.update({
      where: { id: params.id },
      data: updateData,
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
        projectId: params.id,
        oldStatus: existingProject.status,
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