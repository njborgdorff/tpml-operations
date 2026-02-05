import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
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
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is project owner or admin
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { createdById: session.user.id },
          { 
            members: { 
              some: { 
                userId: session.user.id,
                role: { in: ["OWNER", "ADMIN"] }
              } 
            } 
          }
        ]
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      )
    }

    const { name, description, status } = await request.json()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}