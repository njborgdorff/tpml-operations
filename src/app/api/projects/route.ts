import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ProjectStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    // Build where clause based on filters
    let whereClause: any = {}

    if (userId) {
      whereClause.userId = userId
    }

    if (status) {
      if (status === 'ACTIVE') {
        // Active projects are IN_PROGRESS and COMPLETE
        whereClause.status = {
          in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
        }
      } else if (status === 'FINISHED') {
        // Finished projects are ARCHIVED
        whereClause.status = ProjectStatus.ARCHIVED
      } else if (Object.values(ProjectStatus).includes(status as ProjectStatus)) {
        whereClause.status = status as ProjectStatus
      }
    }

    const projects = await db.project.findMany({
      where: whereClause,
      include: {
        user: true,
        statusHistory: {
          include: {
            user: true
          },
          orderBy: {
            changedAt: 'desc'
          },
          take: 5 // Limit history for performance
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
    const body = await request.json()
    const { name, description, userId } = body

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Name and userId are required' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        name,
        description,
        userId,
        status: ProjectStatus.IN_PROGRESS
      },
      include: {
        user: true,
        statusHistory: {
          include: {
            user: true
          }
        }
      }
    })

    // Create initial status history entry
    await db.projectStatusHistory.create({
      data: {
        projectId: project.id,
        oldStatus: null,
        newStatus: ProjectStatus.IN_PROGRESS,
        changedBy: userId
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