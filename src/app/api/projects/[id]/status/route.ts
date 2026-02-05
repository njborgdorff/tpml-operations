import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { ProjectStatus, UpdateProjectStatusRequest } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as UpdateProjectStatusRequest
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get current project
    const currentProject = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        user: true
      }
    })

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user owns the project or has admin role
    if (currentProject.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't update if status is the same
    if (currentProject.status === status) {
      return NextResponse.json(currentProject)
    }

    // Update project status and add to history
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        status,
        archivedAt: status === ProjectStatus.FINISHED ? new Date() : null,
        statusHistory: {
          create: {
            oldStatus: currentProject.status,
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
          orderBy: { changedAt: 'desc' },
          take: 5
        }
      }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Failed to update project status:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}