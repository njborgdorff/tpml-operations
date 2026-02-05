import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const VALID_STATUSES = ['IN_PROGRESS', 'COMPLETE', 'APPROVED'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    // Validate project ID format
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { status } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Get the current project
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user owns the project or is admin
    if (currentProject.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't allow status changes for finished projects
    if (currentProject.status === 'FINISHED') {
      return NextResponse.json(
        { error: 'Cannot change status of finished projects' },
        { status: 400 }
      )
    }

    // Prevent setting the same status
    if (currentProject.status === status) {
      return NextResponse.json(
        { error: 'Project already has this status' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update project status
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: status as any,
          updatedAt: now
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
      await tx.projectStatusHistory.create({
        data: {
          projectId: projectId,
          oldStatus: currentProject.status as any,
          newStatus: status as any,
          changedBy: session.user.id,
          changedAt: now
        }
      })

      return updatedProject
    })

    console.log(`Project ${projectId} status changed from ${currentProject.status} to ${status} by user ${session.user.id}`)

    return NextResponse.json(result)
  } catch (error) {
    // Log error with context but don't expose details
    console.error('Error updating project status:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      projectId: params?.id,
      userId: (await getServerSession(authOptions))?.user?.id,
      timestamp: new Date().toISOString()
    })

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return NextResponse.json(
            { error: 'A constraint violation occurred' },
            { status: 409 }
          )
        case 'P2025':
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 }
          )
        default:
          return NextResponse.json(
            { error: 'Database operation failed' },
            { status: 500 }
          )
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}