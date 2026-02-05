import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ProjectStatus } from "@prisma/client";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

const projectFiltersSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETE", "APPROVED", "FINISHED", "active", "finished"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterResult = projectFiltersSchema.safeParse({
      status: searchParams.get("status"),
    });

    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid filters", details: filterResult.error.errors },
        { status: 400 }
      );
    }

    const { status } = filterResult.data;

    let statusFilter: ProjectStatus[] | undefined;
    if (status === "active") {
      statusFilter = ["IN_PROGRESS", "COMPLETE"];
    } else if (status === "finished") {
      statusFilter = ["FINISHED"];
    } else if (status && status !== "active" && status !== "finished") {
      statusFilter = [status as ProjectStatus];
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        ...(statusFilter && { status: { in: statusFilter } }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { name, description } = result.data;

    // Check for duplicate project names for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: name,
        status: {
          not: "FINISHED",
        },
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 409 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: session.user.id,
        status: "IN_PROGRESS",
      },
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

    // Create initial status history entry
    await prisma.projectStatusHistory.create({
      data: {
        projectId: project.id,
        oldStatus: null,
        newStatus: "IN_PROGRESS",
        changedBy: session.user.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}