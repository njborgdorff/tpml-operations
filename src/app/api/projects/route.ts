import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const view = searchParams.get('view') // 'active' or 'finished'

    let whereClause: any = {
      userId: session.user.id
    }

    // Filter based on view parameter
    if (view === 'finished') {
      whereClause.status = 'FINISHED'
    } else if (view === 'active') {
      whereClause.status = {
        in: ['IN_PROGRESS', 'COMPLETE', 'APPROVED']
      }
    } else if (status) {
      whereClause.status = status
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
          take: 1
        }
      },
      orderBy: [
        {
          archivedAt: 'desc' // Finished projects sorted by archive date
        },
        {
          updatedAt: 'desc'
        }
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: session.user.id,
        status: 'IN_PROGRESS'
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
        newStatus: 'IN_PROGRESS',
        changedBy: session.user.id
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