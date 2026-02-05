import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';
import { 
  validateStatusTransition, 
  isValidProjectStatus,
  ProjectStatusTransitionError,
} from '@/lib/project-utils';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.string().refine(isValidProjectStatus, {
    message: `Invalid status. Must be one of: ${Object.values(ProjectStatus).join(', ')}`,
  }),
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 
        { status: 401 }
      );
    }

    const { id } = params;

    // Validate project ID format (assuming CUID)
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_ID' }, 
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = updateStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid status data', 
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors 
        }, 
        { status: 400 }
      );
    }

    const newStatus = validationResult.data.status as ProjectStatus;

    // First, verify the project exists and user owns it
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found', code: 'NOT_FOUND' }, 
        { status: 404 }
      );
    }

    // Check if status is already the target status
    if (existingProject.status === newStatus) {
      return NextResponse.json(
        { 
          error: 'Project already has this status', 
          code: 'NO_CHANGE_REQUIRED',
          currentStatus: existingProject.status 
        }, 
        { status: 400 }
      );
    }

    // Validate status transition
    try {
      validateStatusTransition(existingProject.status, newStatus);
    } catch (error) {
      if (error instanceof ProjectStatusTransitionError) {
        return NextResponse.json(
          { 
            error: error.message, 
            code: 'INVALID_TRANSITION',
            currentStatus: error.currentStatus,
            targetStatus: error.targetStatus 
          }, 
          { status: 400 }
        );
      }
      throw error; // Re-throw if it's not a transition error
    }

    // Update project status and create history record in a transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      // Check for concurrent updates by comparing updatedAt
      const currentProject = await tx.project.findUnique({
        where: { id },
        select: { status: true, updatedAt: true },
      });

      if (!currentProject) {
        throw new Error('Project not found during transaction');
      }

      if (currentProject.status !== existingProject.status) {
        throw new Error('Project status was modified by another user. Please refresh and try again.');
      }

      // Update the project
      const project = await tx.project.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === ProjectStatus.FINISHED && { archivedAt: new Date() }),
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

      // Create status history record
      await tx.projectStatusHistory.create({
        data: {
          projectId: id,
          oldStatus: existingProject.status,
          newStatus,
          changedBy: session.user.id,
        },
      });

      return project;
    });

    return NextResponse.json({
      project: updatedProject,
      message: `Project status updated to ${newStatus}`,
    });

  } catch (error) {
    console.error('Error updating project status:', error);
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('concurrent') || error.message.includes('modified by another user')) {
        return NextResponse.json(
          { 
            error: error.message, 
            code: 'CONCURRENT_UPDATE' 
          }, 
          { status: 409 }
        );
      }

      if (error.message.includes('not found during transaction')) {
        return NextResponse.json(
          { 
            error: 'Project not found', 
            code: 'NOT_FOUND' 
          }, 
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to update project status', 
          code: 'DATABASE_ERROR',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined 
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNKNOWN_ERROR' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_ID' }, 
        { status: 400 }
      );
    }

    // Get project status history
    const statusHistory = await prisma.projectStatusHistory.findMany({
      where: {
        project: {
          id,
          userId: session.user.id, // Ensure user owns the project
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    if (statusHistory.length === 0) {
      // Check if project exists but user doesn't own it
      const projectExists = await prisma.project.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!projectExists) {
        return NextResponse.json(
          { error: 'Project not found', code: 'NOT_FOUND' }, 
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: 'Unauthorized to view this project', code: 'UNAUTHORIZED' }, 
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ statusHistory });

  } catch (error) {
    console.error('Error fetching project status history:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch status history', 
        code: 'DATABASE_ERROR',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
      }, 
      { status: 500 }
    );
  }
}