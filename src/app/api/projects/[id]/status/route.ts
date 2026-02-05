import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@/types/project'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, userId } = body

    if (!status || !userId) {
      return NextResponse.json(
        { error: 'Status and userId are required' },
        { status: 400 }
      )
    }

    // Validate status enum
    if (!Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Get current project to track old status
    const currentProject = await prisma.project.findUnique({
      where: { id },
      select: { status: true, userId: true }
    })

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user owns the project
    if (currentProject.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this project' },
        { status: 403 }
      )
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status,
        archivedAt: status === ProjectStatus.FINISHED ? new Date() : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: id,
        oldStatus: currentProject.status,
        newStatus: status,
        changedBy: userId
      }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project status:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}