import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const showFinished = searchParams.get('showFinished') === 'true';

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause
    const where: any = {
      userId: user.id
    };

    if (statusFilter) {
      const statuses = statusFilter.split(',') as ProjectStatus[];
      where.status = { in: statuses };
    } else if (!showFinished) {
      // By default, exclude finished projects
      where.status = {
        not: ProjectStatus.FINISHED
      };
    }

    const projects = await prisma.project.findMany({
      where,
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
          take: 5 // Limit history to recent changes
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
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

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        userId: user.id,
        statusHistory: {
          create: {
            newStatus: ProjectStatus.IN_PROGRESS,
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
          }
        }
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}