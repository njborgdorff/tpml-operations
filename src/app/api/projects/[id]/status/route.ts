import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
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

    const { status } = await request.json();

    if (!Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find project and verify ownership
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id }
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (existingProject.status === status) {
      return NextResponse.json(
        { error: 'Project is already in this status' },
        { status: 400 }
      );
    }

    // Update project status and create history entry
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        status,
        archivedAt: status === ProjectStatus.FINISHED ? new Date() : null,
        statusHistory: {
          create: {
            oldStatus: existingProject.status,
            newStatus: status,
            changedBy: user.id
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            changedAt: 'desc'
          },
          take: 5
        }
      }
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