import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const history = await prisma.projectStatusHistory.findMany({
      where: {
        projectId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to fetch project history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project history' },
      { status: 500 }
    )
  }
}
