import { NextRequest, NextResponse } from 'next/server'
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
    const { id } = params
    const body = await request.json()
    const { status, userId = 'user_1' } = body

    // Validate input
    if (!id?.trim()) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (!Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    if (!userId?.trim()) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get current project
    const currentProject = await prisma.project.findUnique({
      where: { id: id.trim() }
    })

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Validate status transition
    if (status === ProjectStatus.FINISHED && currentProject.status !== ProjectStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Only approved projects can be moved to finished' },
        { status: 400 }
      )
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id: id.trim() },
      data: {
        status: status,
        archivedAt: status === ProjectStatus.FINISHED ? new Date() : null,
      },
      include: {
        statusHistory: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            changedAt: 'desc'
          }
        }
      }
    })

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: id.trim(),
        oldStatus: currentProject.status,
        newStatus: status,
        changedBy: userId.trim(),
      },
    })

    return NextResponse.json({ project: updatedProject })
  } catch (error) {
    console.error('Failed to update project status:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}