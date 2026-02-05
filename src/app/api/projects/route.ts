import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const filter = searchParams.get("filter") // "active" or "finished"

    let whereClause: any = {
      userId: session.user.id,
    }

    // Apply status filter
    if (status && Object.values(ProjectStatus).includes(status as ProjectStatus)) {
      whereClause.status = status
    }

    // Apply active/finished filter
    if (filter === "active") {
      whereClause.status = {
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
      }
    } else if (filter === "finished") {
      whereClause.status = ProjectStatus.ARCHIVED
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
                email: true,
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
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: ProjectStatus.IN_PROGRESS,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
        changedBy: session.user.id,
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}