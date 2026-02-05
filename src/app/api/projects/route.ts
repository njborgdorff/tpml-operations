import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const viewFilter = searchParams.get("view") // "active" or "finished"

    let whereCondition: any = {
      userId: user.id
    }

    if (viewFilter === "active") {
      whereCondition.status = {
        in: [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETE]
      }
    } else if (viewFilter === "finished") {
      whereCondition.status = ProjectStatus.ARCHIVED
    } else if (statusFilter) {
      whereCondition.status = statusFilter as ProjectStatus
    }

    const projects = await prisma.project.findMany({
      where: whereCondition,
      include: {
        statusHistory: {
          orderBy: { changedAt: "desc" },
          take: 1,
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || "",
        userId: user.id,
        status: ProjectStatus.IN_PROGRESS
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
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}