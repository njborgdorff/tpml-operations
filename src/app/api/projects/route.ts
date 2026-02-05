import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/projects - List user's projects
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { members: { some: { userId: session.user.id } } }
        ]
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Add task statistics
    const projectsWithStats = projects.map(project => ({
      ...project,
      taskStats: {
        total: project.tasks.length,
        todo: project.tasks.filter(t => t.status === "TODO").length,
        inProgress: project.tasks.filter(t => t.status === "IN_PROGRESS").length,
        done: project.tasks.filter(t => t.status === "DONE").length,
      }
    }))

    return NextResponse.json(projectsWithStats)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        createdById: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER"
          }
        }
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
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