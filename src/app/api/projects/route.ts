import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ProjectStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const showActive = searchParams.get('showActive') === 'true';
    const showFinished = searchParams.get('showFinished') === 'true';

    // Find user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build status filter
    let statusWhere: any = {};
    
    if (statusFilter) {
      const statuses = statusFilter.split(',') as ProjectStatus[];
      statusWhere.status = { in: statuses };
    } else if (showActive) {
      statusWhere.status = { 
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED] 
      };
    } else if (showFinished) {
      statusWhere.status = ProjectStatus.FINISHED;
    }

    const projects = await db.project.findMany({
      where: {
        userId: user.id,
        ...statusWhere,
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
      orderBy: {
        updatedAt: 'desc',
      },
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

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const project = await db.project.create({
      data: {
        name,
        description,
        status: ProjectStatus.IN_PROGRESS,
        userId: user.id,
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
        oldStatus: null,
        newStatus: ProjectStatus.IN_PROGRESS,
        changedBy: user.id,
      },
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