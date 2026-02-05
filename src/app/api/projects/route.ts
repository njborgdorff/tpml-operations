import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';
import { validateProjectData, isValidProjectStatus } from '@/lib/project-utils';
import { z } from 'zod';

// Request validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

const projectsQuerySchema = z.object({
  status: z.enum(['active', 'finished', 'all']).optional().default('active'),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = projectsQuerySchema.safeParse({
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          code: 'VALIDATION_ERROR',
          details: queryResult.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { status, page, limit } = queryResult.data;

    // Build status filter
    let statusFilter: { status?: { in: ProjectStatus[] } | ProjectStatus } = {};
    if (status === 'active') {
      statusFilter.status = { 
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED] 
      };
    } else if (status === 'finished') {
      statusFilter.status = ProjectStatus.FINISHED;
    }
    // 'all' means no status filter

    const skip = (page - 1) * limit;

    // Get projects with pagination and total count
    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: {
          userId: session.user.id,
          ...statusFilter,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 1,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({
        where: {
          userId: session.user.id,
          ...statusFilter,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      projects,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch projects', 
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid project data', 
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { name, description } = validationResult.data;

    // Check for duplicate project names for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name,
        status: { not: ProjectStatus.FINISHED }, // Allow same name if previous is finished
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { 
          error: 'A project with this name already exists', 
          code: 'DUPLICATE_NAME',
          field: 'name' 
        }, 
        { status: 409 }
      );
    }

    // Create project and initial status history in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          description,
          status: ProjectStatus.IN_PROGRESS,
          userId: session.user.id,
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

      // Create initial status history entry
      await tx.projectStatusHistory.create({
        data: {
          projectId: newProject.id,
          oldStatus: null,
          newStatus: ProjectStatus.IN_PROGRESS,
          changedBy: session.user.id,
        },
      });

      return newProject;
    });

    return NextResponse.json(project, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to create project', 
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