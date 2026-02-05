import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ProjectStatus } from "@prisma/client";

const updateStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETE", "APPROVED", "FINISHED"]),
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid status", details: result.error.errors },
        { status: 400 }
      );
    }

    const { status } = result.data;

    // Check if project exists and user owns it
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Validate status transition
    if (status === "FINISHED" && existingProject.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved projects can be moved to finished" },
        { status: 400 }
      );
    }

    // If moving to FINISHED, set archivedAt
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "FINISHED") {
      updateData.archivedAt = new Date();
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: id,
        oldStatus: existingProject.status,
        newStatus: status,
        changedBy: session.user.id,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}