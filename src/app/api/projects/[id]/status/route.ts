import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ProjectStatus } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status provided" },
        { status: 400 }
      )
    }

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Don't allow updating if already finished
    if (existingProject.status === ProjectStatus.FINISHED) {
      return NextResponse.json(
        { error: "Cannot update status of finished projects" },
        { status: 400 }
      )
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: {
        status: status as ProjectStatus,
        updatedAt: new Date(),
        // Set archivedAt when moving to FINISHED
        ...(status === ProjectStatus.FINISHED && {
          archivedAt: new Date()
        })
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
        projectId: params.id,
        oldStatus: existingProject.status,
        newStatus: status as ProjectStatus,
        changedBy: user.id,
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