import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tasks - List user's tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    const whereClause: any = {
      project: {
        OR: [
          { createdById: session.user.id },
          { members: { some: { userId: session.user.id } } }
        ]
      }
    }

    if (projectId) {
      whereClause.projectId = projectId
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: {
          select: { name: true, id: true }
        },
        assignedTo: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, projectId, priority, assignedToId, dueDate } = await request.json()

    if (!title || !projectId) {
      return NextResponse.json(
        { error: "Title and project ID are required" },
        { status: 400 }
      )
    }

    // Verify user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: session.user.id },
          { members: { some: { userId: session.user.id } } }
        ]
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        priority: priority || "MEDIUM",
        assignedToId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: {
          select: { name: true, id: true }
        },
        assignedTo: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}