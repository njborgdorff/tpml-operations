import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid project status' },
        { status: 400 }
      )
    }

    // First, get the current project to check ownership and current status
    const currentProject = await prisma.project.findUnique({
      where: { id: params.id }
    })

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (currentProject.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own projects' },
        { status: 403 }
      )
    }

    if (currentProject.status === status) {
      return NextResponse.json(
        { error: 'Project already has this status' },
        { status: 400 }
      )
    }

    // Update project status and create history entry in a transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      // Update the project
      const project = await tx.project.update({
        where: { id: params.id },
        data: {
          status: status,
          archivedAt: status === ProjectStatus.FINISHED ? new Date() : null
        },
        include: {
          user: true,
          projectStatusHistory: {
            include: {
              user: true
            },
            orderBy: {
              changedAt: 'desc'
            }
          }
        }
      })

      // Create status history entry
      await tx.projectStatusHistory.create({
        data: {
          projectId: params.id,
          oldStatus: currentProject.status,
          newStatus: status,
          changedBy: session.user.id
        }
      })

      return project
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