import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ProjectStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { newStatus, changedBy } = body

    if (!newStatus || !changedBy) {
      return NextResponse.json(
        { error: 'newStatus and changedBy are required' },
        { status: 400 }
      )
    }

    if (!Object.values(ProjectStatus).includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Get current project to check existing status
    const currentProject = await db.project.findUnique({
      where: { id }
    })

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Use transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Update project status
      const updatedProject = await tx.project.update({
        where: { id },
        data: {
          status: newStatus,
          archivedAt: newStatus === ProjectStatus.ARCHIVED ? new Date() : null
        },
        include: {
          user: true,
          statusHistory: {
            include: {
              user: true
            },
            orderBy: {
              changedAt: 'desc'
            },
            take: 5
          }
        }
      })

      // Create status history entry
      await tx.projectStatusHistory.create({
        data: {
          projectId: id,
          oldStatus: currentProject.status,
          newStatus: newStatus,
          changedBy: changedBy
        }
      })

      return updatedProject
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating project status:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}