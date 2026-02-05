import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let whereClause: any = {};

    // Handle filtering by status
    if (status) {
      if (status === 'ACTIVE') {
        // Active means In Progress or Complete
        whereClause.status = {
          in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
        };
      } else if (status === 'FINISHED') {
        whereClause.status = ProjectStatus.FINISHED;
      } else if (Object.values(ProjectStatus).includes(status as ProjectStatus)) {
        whereClause.status = status;
      }
    }

    // Handle filtering by user
    if (userId) {
      whereClause.userId = userId;
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
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
          take: 1,
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
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, userId } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Name and userId are required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId,
        status: ProjectStatus.IN_PROGRESS,
        statusHistory: {
          create: {
            newStatus: ProjectStatus.IN_PROGRESS,
            changedBy: userId
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

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}