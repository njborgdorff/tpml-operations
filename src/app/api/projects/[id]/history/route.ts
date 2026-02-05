import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const history = await prisma.projectStatusHistory.findMany({
      where: {
        projectId: id
      },
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
      }
    });

    return NextResponse.json({
      project,
      history
    });
  } catch (error) {
    console.error('Error fetching project history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project history' },
      { status: 500 }
    );
  }
}