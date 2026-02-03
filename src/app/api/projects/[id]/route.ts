import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { syncKnowledgeBase } from '@/lib/knowledge/sync';
import fs from 'fs/promises';
import path from 'path';

const PROJECTS_ROOT = 'C:/tpml-ai-team/projects';

/**
 * DELETE /api/projects/[id]
 *
 * Deletes a project and optionally its folder.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const deleteFolder = url.searchParams.get('deleteFolder') === 'true';

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete related records first (due to foreign key constraints)
    await prisma.$transaction([
      // Delete artifacts
      prisma.artifact.deleteMany({ where: { projectId: id } }),
      // Delete conversations
      prisma.conversation.deleteMany({ where: { projectId: id } }),
      // Delete sprint reviews
      prisma.sprintReview.deleteMany({
        where: { sprint: { projectId: id } },
      }),
      // Delete sprints
      prisma.sprint.deleteMany({ where: { projectId: id } }),
      // Delete the project
      prisma.project.delete({ where: { id } }),
    ]);

    // Optionally delete the project folder
    // Only delete if it's not a target codebase (to protect existing projects)
    if (deleteFolder && !project.targetCodebase) {
      const projectPath = path.join(PROJECTS_ROOT, project.slug);
      try {
        await fs.rm(projectPath, { recursive: true, force: true });
        console.log(`[Projects] Deleted folder: ${projectPath}`);
      } catch (folderError) {
        console.warn(`[Projects] Could not delete folder ${projectPath}:`, folderError);
        // Don't fail the request - database deletion is primary
      }
    }

    // Sync knowledge base (fire and forget)
    syncKnowledgeBase().catch(err => console.error('[Projects] Knowledge sync failed:', err));

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" deleted`,
      folderDeleted: deleteFolder && !project.targetCodebase,
    });
  } catch (error) {
    console.error('Delete project failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]
 *
 * Get a single project by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        sprints: { orderBy: { number: 'asc' } },
        artifacts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Get project failed:', error);
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]
 *
 * Update project settings, including assigning an implementer.
 * Only the project owner can assign an implementer.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { implementerId } = body;

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only the owner can assign an implementer (not implementers themselves)
    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Only the project owner can assign an implementer' }, { status: 403 });
    }

    // If implementerId is provided, verify the user exists
    if (implementerId) {
      const implementer = await prisma.user.findUnique({
        where: { id: implementerId },
      });

      if (!implementer) {
        return NextResponse.json({ error: 'Implementer user not found' }, { status: 400 });
      }
    }

    // Update the project
    const updated = await prisma.project.update({
      where: { id },
      data: {
        implementerId: implementerId || null,
      },
      include: {
        implementer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: implementerId
        ? `Implementer assigned to project "${project.name}"`
        : `Implementer removed from project "${project.name}"`,
      project: {
        id: updated.id,
        name: updated.name,
        implementerId: updated.implementerId,
        implementer: updated.implementer,
      },
    });
  } catch (error) {
    console.error('Update project failed:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
