import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProjectStatus, ProjectFilters } from '@/types/project'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ProjectStatus | 'ACTIVE' | 'FINISHED' | null
    const userId = searchParams.get('userId')

    let where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (status) {
      if (status === 'ACTIVE') {
        where.status = {
          in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
        }
      } else if (status === 'FINISHED') {
        where.status = ProjectStatus.FINISHED
      } else {
        where.status = status
      }
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' }
      ]
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

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId,
        status: ProjectStatus.IN_PROGRESS
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

    // Create initial status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: project.id,
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