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

    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the project and verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update the project status
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { 
        status,
        archivedAt: status === ProjectStatus.FINISHED ? new Date() : project.archivedAt
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
        projectId: project.id,
        oldStatus: project.status,
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