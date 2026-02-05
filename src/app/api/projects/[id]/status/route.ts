import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      )
    }

    // Find the project and ensure user owns it
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Don't update if status is the same
    if (existingProject.status === status) {
      return NextResponse.json(existingProject)
    }

    // Business rule: Only APPROVED projects can be moved to ARCHIVED
    if (status === ProjectStatus.ARCHIVED && existingProject.status !== ProjectStatus.APPROVED) {
      return NextResponse.json(
        { error: "Only approved projects can be archived" },
        { status: 400 }
      )
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status,
        archivedAt: status === ProjectStatus.ARCHIVED ? new Date() : null,
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

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: id,
        oldStatus: existingProject.status,
        newStatus: status,
        changedBy: session.user.id,
      }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error("Error updating project status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}