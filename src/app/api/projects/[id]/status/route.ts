import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { ProjectStatus } from '@prisma/client'
import { z } from 'zod'
import { FINISHED_WORKFLOW_TRANSITIONS } from '@/lib/project-utils'

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
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    // Get current project (user must be owner)
    const currentProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    })

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Validate status transition using shared transition map
    const allowed = FINISHED_WORKFLOW_TRANSITIONS[currentProject.status]
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${currentProject.status} to ${status}` },
        { status: 400 }
      )
    }

    // Update with optimistic locking: WHERE status = currentStatus prevents
    // race conditions where another request changed the status between our
    // read and write. If 0 rows updated, the status changed underneath us.
    const [updatedProject] = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.updateMany({
        where: {
          id: params.id,
          ownerId: session.user.id,
          status: currentProject.status, // optimistic lock
        },
        data: {
          status,
          archivedAt: status === ProjectStatus.FINISHED ? new Date() : null,
        },
      })

      if (updated.count === 0) {
        throw new Error('CONFLICT')
      }

      // Fetch the updated project with includes
      const project = await tx.project.findUniqueOrThrow({
        where: { id: params.id },
        include: {
          client: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      const history = await tx.projectStatusHistory.create({
        data: {
          projectId: params.id,
          oldStatus: currentProject.status,
          newStatus: status,
          changedBy: session.user.id,
        },
      })

      return [project, history] as const
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'CONFLICT') {
      return NextResponse.json(
        { error: 'Project status was changed by another request. Please refresh and try again.' },
        { status: 409 }
      )
    }

    console.error('Failed to update project status:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}
