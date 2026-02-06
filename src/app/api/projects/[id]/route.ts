import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE /api/projects/[id] - Delete a project and all related data
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      include: {
        sprints: { select: { id: true } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete in order to respect foreign key constraints
    await prisma.$transaction(async (tx) => {
      const sprintIds = project.sprints.map(s => s.id);

      // 1. Sprint reviews (reference sprints)
      if (sprintIds.length > 0) {
        await tx.sprintReview.deleteMany({
          where: { sprintId: { in: sprintIds } },
        });
      }

      // 2. Sprints (reference project, RESTRICT)
      await tx.sprint.deleteMany({
        where: { projectId: params.id },
      });

      // 3. Artifacts (reference project, RESTRICT)
      await tx.artifact.deleteMany({
        where: { projectId: params.id },
      });

      // 4. Conversations (reference project, RESTRICT)
      await tx.conversation.deleteMany({
        where: { projectId: params.id },
      });

      // 5. Project (CASCADE handles reference_documents, project_status_history)
      await tx.project.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
