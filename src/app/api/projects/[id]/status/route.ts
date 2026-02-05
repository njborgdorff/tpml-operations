import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProjectStatus } from '@prisma/client'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
})

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
    const session = await getAuthSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    // Get current project
    const currentProject = await prisma.project.findUnique({
      where: {
        id: params.id,
        userId: user.id, // Ensure user owns the project
      },
    })

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Validate status transition
    const isValidTransition = validateStatusTransition(currentProject.status, status)
    if (!isValidTransition) {
      return NextResponse.json(
        { error: 'Invalid status transition' },
        { status: 400 }
      )
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        status,
        archivedAt: status === ProjectStatus.FINISHED ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: params.id,
        oldStatus: currentProject.status,
        newStatus: status,
        changedBy: user.id,
      },
    })

    return NextResponse.json({ project: updatedProject })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to update project status:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}

function validateStatusTransition(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
): boolean {
  // Define valid transitions
  const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    [ProjectStatus.IN_PROGRESS]: [ProjectStatus.COMPLETE],
    [ProjectStatus.COMPLETE]: [ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED],
    [ProjectStatus.APPROVED]: [ProjectStatus.COMPLETE, ProjectStatus.FINISHED],
    [ProjectStatus.FINISHED]: [], // No transitions allowed from finished
  }

  return validTransitions[currentStatus]?.includes(newStatus) || false
}