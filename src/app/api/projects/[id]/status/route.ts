import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PrismaClient, ProjectStatus } from "@prisma/client"

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' }, 
        { status: 400 }
      )
    }

    // Get the current project to check ownership and get old status
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (existingProject.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't update if status is the same
    if (existingProject.status === status) {
      return NextResponse.json(existingProject)
    }

    // Update project status and create history entry in a transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      // Update the project status
      const project = await tx.project.update({
        where: { id: params.id },
        data: { 
          status,
          archivedAt: status === ProjectStatus.ARCHIVED ? new Date() : null
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
          projectId: params.id,
          oldStatus: existingProject.status,
          newStatus: status,
          changedBy: user.id
        }
      })

      return project
    })

    // Fetch the complete project with status history for the response
    const projectWithHistory = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            changedAt: 'desc'
          }
        }
      }
    })

    return NextResponse.json(projectWithHistory)
  } catch (error) {
    console.error('Error updating project status:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}