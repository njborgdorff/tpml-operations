import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@/types/project'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const statusParam = searchParams.get('status')
    const includeFinished = searchParams.get('includeFinished') === 'true'
    const userId = searchParams.get('userId')

    // Build filter conditions
    const where: any = {}
    
    if (userId) {
      where.userId = userId
    }

    if (statusParam) {
      if (statusParam.includes(',')) {
        // Multiple statuses
        where.status = {
          in: statusParam.split(',') as ProjectStatus[]
        }
      } else {
        // Single status
        where.status = statusParam as ProjectStatus
      }
    } else if (!includeFinished) {
      // Default: exclude finished projects unless explicitly requested
      where.status = {
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED]
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
        { updatedAt: 'desc' }
      ]
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
    const session = await getServerSession(authOptions)
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
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: ProjectStatus.IN_PROGRESS,
        userId: user.id
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
        oldStatus: null,
        newStatus: ProjectStatus.IN_PROGRESS,
        changedBy: user.id
      }
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