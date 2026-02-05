import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { status } = await request.json()

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Get current project to check ownership and current status
    const currentProject = await prisma.project.findUnique({
      where: { id: params.id }
    })

    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (currentProject.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If status is the same, no need to update
    if (currentProject.status === status) {
      return NextResponse.json(currentProject)
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        status: status as ProjectStatus,
        archivedAt: status === ProjectStatus.ARCHIVED ? new Date() : null,
        updatedAt: new Date()
      }
    })

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: params.id,
        oldStatus: currentProject.status,
        newStatus: status as ProjectStatus,
        changedBy: user.id
      }
    })

    // Return updated project with history
    const projectWithHistory = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        statusHistory: {
          orderBy: { changedAt: "desc" },
          take: 5,
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    return NextResponse.json(projectWithHistory)
  } catch (error) {
    console.error("Error updating project status:", error)
    return NextResponse.json(
      { error: "Failed to update project status" },
      { status: 500 }
    )
  }
}