import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

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

    // Update project status to FINISHED and set archivedAt
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'FINISHED',
        archivedAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: projectId,
        oldStatus: project.status,
        newStatus: 'FINISHED',
        changedBy: session.user.id,
        changedAt: new Date()
      }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error archiving project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}