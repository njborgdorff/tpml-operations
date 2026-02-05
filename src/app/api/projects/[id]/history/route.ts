import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const history = await db.projectStatusHistory.findMany({
      where: {
        projectId: id
      },
      include: {
        user: true
      },
      orderBy: {
        changedAt: 'desc'
      }
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching project history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project history' },
      { status: 500 }
    )
  }
}