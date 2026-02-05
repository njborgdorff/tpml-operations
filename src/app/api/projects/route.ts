import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const filterType = searchParams.get('filter') // 'active', 'finished', or 'all'

    let whereClause: any = {
      userId: session.user.id,
    }

    // Apply filtering logic
    if (filterType === 'active') {
      whereClause.status = {
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
      }
    } else if (filterType === 'finished') {
      whereClause.status = ProjectStatus.FINISHED
    } else if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter as ProjectStatus
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 1,
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' }, 
        { status: 400 }
      )
    }

    // Create project and initial status history in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          description,
          userId: session.user.id,
          status: ProjectStatus.IN_PROGRESS
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      // Create initial status history entry
      await tx.projectStatusHistory.create({
        data: {
          projectId: newProject.id,
          oldStatus: null,
          newStatus: ProjectStatus.IN_PROGRESS,
          changedBy: session.user.id
        }
      })

      return newProject
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}