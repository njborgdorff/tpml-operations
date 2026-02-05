import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@/types/project'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const projectId = params.id
    const body = await request.json()
    const { status } = body

    // Validate status
    if (!Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Get current project
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
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

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if status is actually changing
    if (currentProject.status === status) {
      return NextResponse.json(currentProject)
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
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
        projectId: projectId,
        oldStatus: currentProject.status,
        newStatus: status,
        changedBy: user.id
      }
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