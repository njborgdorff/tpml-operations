import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { generateArtifacts } from '@/lib/artifacts/generator';
import { createImplementationHandoff } from '@/lib/orchestration/claude-code';
import { syncKnowledgeBase } from '@/lib/knowledge/sync';
import path from 'path';

export async function POST(
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
    const { action, notes } = body;

    if (!['approve', 'revision', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const approvalStatusMap: Record<string, string> = {
      approve: 'APPROVED',
      revision: 'REVISION_REQUESTED',
      reject: 'REJECTED',
    };

    const projectStatusMap: Record<string, string> = {
      approve: 'APPROVED',
      revision: 'INTAKE', // Will need re-planning
      reject: 'CANCELLED',
    };

    // Update project
    const updated = await prisma.project.update({
      where: { id },
      data: {
        approvalStatus: approvalStatusMap[action] as 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED',
        approvalNotes: notes || null,
        approvedAt: action === 'approve' ? new Date() : null,
        status: projectStatusMap[action] as 'APPROVED' | 'INTAKE' | 'CANCELLED',
      },
    });

    // If approved, generate artifacts and prepare for implementation kickoff
    let kickoffReady = false;
    if (action === 'approve' && updated.pmPlan && updated.ctoArchitecture) {
      const { backlogContent, architectureContent } = await generateArtifacts(updated);

      // Auto-create the implementation handoff document
      try {
        const projectPath = path.join('C:/tpml-ai-team/projects', updated.slug);
        await createImplementationHandoff(
          projectPath,
          updated.name,
          backlogContent,
          architectureContent,
          notes || undefined
        );

        // Store the handoff as an artifact
        await prisma.artifact.create({
          data: {
            projectId: updated.id,
            type: 'HANDOFF',
            name: 'HANDOFF_CTO_TO_IMPLEMENTER.md',
            content: `# Handoff: CTO → Implementer\n\nProject approved. See project docs for details.`,
            version: 1,
          },
        });

        kickoffReady = true;
        console.log(`[Approval] Handoff created for ${updated.name}`);
      } catch (handoffError) {
        console.warn('[Approval] Could not create handoff:', handoffError);
        // Don't fail the approval if handoff creation fails
      }
    }

    // Sync knowledge base (fire and forget)
    syncKnowledgeBase().catch(err => console.error('[Approve] Knowledge sync failed:', err));

    return NextResponse.json({
      success: true,
      project: updated,
      kickoffReady,
      nextSteps: action === 'approve' ? [
        'Artifacts generated (BACKLOG.md, ARCHITECTURE.md)',
        'Implementation handoff created (HANDOFF_CTO_TO_IMPLEMENTER.md)',
        kickoffReady
          ? 'Ready to kickoff! Use /api/projects/{id}/kickoff to start implementation'
          : 'Manual kickoff required via Claude Code CLI',
      ] : [],
    });

  } catch (error) {
    console.error('Approval failed:', error);
    return NextResponse.json(
      { error: 'Failed to update approval' },
      { status: 500 }
    );
  }
}
