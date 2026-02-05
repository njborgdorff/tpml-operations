import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') as 'active' | 'finished' | null
    const counts = searchParams.get('counts') === 'true'

    let where: any = {
      userId: session.user.id
    }

    // Apply status filter
    if (filter === 'active') {
      where.status = {
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED]
      }
    } else if (filter === 'finished') {
      where.status = ProjectStatus.FINISHED
    }

    // If only counts are requested
    if (counts) {
      const [active, finished, total] = await Promise.all([
        prisma.project.count({
          where: {
            userId: session.user.id,
            status: {
              in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE, ProjectStatus.APPROVED]
            }
          }
        }),
        prisma.project.count({
          where: {
            userId: session.user.id,
            status: ProjectStatus.FINISHED
          }
        }),
        prisma.project.count({
          where: {
            userId: session.user.id
          }
        })
      ])

      return NextResponse.json({ active, finished, total })
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        user: true,
        projectStatusHistory: {
          include: {
            user: true
          },
          orderBy: {
            changedAt: 'desc'
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Create project and initial status history in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          status: ProjectStatus.IN_PROGRESS,
          userId: session.user.id
        },
        include: {
          user: true,
          projectStatusHistory: {
            include: {
              user: true
            },
            orderBy: {
              changedAt: 'desc'
            }
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