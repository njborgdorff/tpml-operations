import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@prisma/client'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name must be less than 255 characters'),
  description: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const showArchived = searchParams.get('archived') === 'true'

    let whereClause: any = {
      userId: session.user.id
    }

    if (showArchived) {
      whereClause.status = ProjectStatus.ARCHIVED
    } else if (statusFilter === 'active') {
      whereClause.status = {
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
      }
    } else if (statusFilter && Object.values(ProjectStatus).includes(statusFilter as ProjectStatus)) {
      whereClause.status = statusFilter as ProjectStatus
    } else if (!showArchived) {
      // Default: exclude archived projects
      whereClause.status = {
        not: ProjectStatus.ARCHIVED
      }
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        statusHistory: {
          orderBy: {
            changedAt: 'desc'
          },
          take: 1,
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = createProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    // Create project and initial status history entry
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: session.user.id,
        status: ProjectStatus.IN_PROGRESS,
        statusHistory: {
          create: {
            oldStatus: null,
            newStatus: ProjectStatus.IN_PROGRESS,
            changedBy: session.user.id
          }
        }
      },
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
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}