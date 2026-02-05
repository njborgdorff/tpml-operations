import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@prisma/client'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      )
    }

    // Get current project
    const currentProject = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
      },
    })

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (currentProject.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Special handling for archiving - set archivedAt timestamp
    const updateData: any = {
      status: status as ProjectStatus,
      updatedAt: new Date(),
    }

    if (status === ProjectStatus.ARCHIVED) {
      updateData.archivedAt = new Date()
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        statusHistory: {
          orderBy: {
            changedAt: 'desc'
          },
          take: 1,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: id,
        oldStatus: currentProject.status,
        newStatus: status as ProjectStatus,
        changedBy: session.user.id,
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}