import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' }, 
        { status: 400 }
      )
    }

    // Verify project exists and user owns it
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found or access denied' }, 
        { status: 404 }
      )
    }

    // Don't allow updating if status is the same
    if (existingProject.status === status) {
      return NextResponse.json(
        { error: 'Project is already in this status' }, 
        { status: 400 }
      )
    }

    // Update project status and create history entry in transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: params.id },
        data: {
          status: status as ProjectStatus,
          archivedAt: status === ProjectStatus.FINISHED ? new Date() : null
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 1,
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      })

      // Create status history entry
      await tx.projectStatusHistory.create({
        data: {
          projectId: params.id,
          oldStatus: existingProject.status,
          newStatus: status as ProjectStatus,
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