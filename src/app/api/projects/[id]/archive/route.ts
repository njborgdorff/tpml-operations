import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

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

    // Get the project first to check status and ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user owns the project or is admin
    if (project.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only APPROVED projects can be moved to FINISHED
    if (project.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Only approved projects can be moved to finished' },
        { status: 400 }
      )
    }

    // Already finished check
    if (project.status === 'FINISHED') {
      return NextResponse.json(
        { error: 'Project is already finished' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update project status to FINISHED and set archivedAt
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'FINISHED',
          archivedAt: now,
          updatedAt: now
        }
      })

      // Create status history entry
      await tx.projectStatusHistory.create({
        data: {
          projectId: projectId,
          oldStatus: project.status,
          newStatus: 'FINISHED',
          changedBy: session.user.id,
          changedAt: now
        }
      })

      return updatedProject
    })

    console.log(`Project ${projectId} archived by user ${session.user.id}`)

    return NextResponse.json(result)
  } catch (error) {
    // Comprehensive error logging with context
    console.error('Error archiving project:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      projectId: params?.id,
      userId: (await getServerSession(authOptions))?.user?.id,
      timestamp: new Date().toISOString(),
      type: 'archive_project_error'
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
        case 'P2014':
          return NextResponse.json(
            { error: 'Related record dependency conflict' },
            { status: 409 }
          )
        default:
          console.error('Unknown Prisma error:', error.code, error.message)
          return NextResponse.json(
            { error: 'Database operation failed' },
            { status: 500 }
          )
      }
    }

    // Handle other known error types
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return NextResponse.json(
        { error: 'Database request failed' },
        { status: 500 }
      )
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return NextResponse.json(
        { error: 'Database system error' },
        { status: 500 }
      )
    }

    // Generic error response - don't expose internal details
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}