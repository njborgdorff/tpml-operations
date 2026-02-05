import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, changedBy } = body;

    if (!status || !changedBy) {
      return NextResponse.json(
        { error: 'Status and changedBy are required' },
        { status: 400 }
      );
    }

    if (!Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get current project to track old status
    const currentProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update project status and create history entry
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        // Set archivedAt if moving to FINISHED status
        ...(status === ProjectStatus.FINISHED && {
          archivedAt: new Date()
        }),
        statusHistory: {
          create: {
            oldStatus: currentProject.status,
            newStatus: status,
            changedBy
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        statusHistory: {
          orderBy: {
            changedAt: 'desc'
          },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    );
  }
}