import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { syncKnowledgeBase } from '@/lib/knowledge/sync';
import { Inngest } from 'inngest';

// Initialize Inngest client for sending events
const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/sprints/[id]/approve
 *
 * Approve and start a sprint that is in AWAITING_APPROVAL status.
 * This is the human-in-the-loop approval gate between sprints.
 */
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
    const body = await request.json().catch(() => ({}));
    const { approvalNotes } = body;

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          include: { client: true, artifacts: true },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (!canAccessProject(sprint.project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (sprint.status !== 'AWAITING_APPROVAL') {
      return NextResponse.json(
        { error: `Sprint is not awaiting approval. Current status: ${sprint.status}` },
        { status: 400 }
      );
    }

    // Approve and start the sprint
    const updatedSprint = await prisma.sprint.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Determine project path for CLI commands
    const targetCodebase = (sprint.project as { targetCodebase?: string }).targetCodebase;
    const projectPath = targetCodebase
      ? `C:\\tpml-ai-team\\projects\\${targetCodebase}`
      : `C:\\tpml-ai-team\\projects\\${sprint.project.slug}`;

    // Get previous sprint's review summary for context
    const previousSprint = await prisma.sprint.findFirst({
      where: {
        projectId: sprint.projectId,
        number: sprint.number - 1,
      },
    });

    // Get all relevant artifacts for the sprint handoff
    const handoffArtifact = sprint.project.artifacts.find(a => a.type === 'HANDOFF');
    const backlogArtifact = sprint.project.artifacts.find(a => a.name === 'BACKLOG.md');
    const architectureArtifact = sprint.project.artifacts.find(a => a.name === 'ARCHITECTURE.md');

    // Build sprint-specific handoff content that includes full documents
    const sprintHandoffContent = buildSprintHandoff(
      sprint.number,
      sprint.name || `Sprint ${sprint.number}`,
      sprint.goal || '',
      backlogArtifact?.content || '',
      architectureArtifact?.content || '',
      handoffArtifact?.content || '',
      previousSprint?.reviewSummary || ''
    );

    // Emit event to trigger AI role invocation for the new sprint
    try {
      await inngest.send({
        name: 'sprint/approved',
        data: {
          projectId: sprint.projectId,
          projectName: sprint.project.name,
          projectSlug: sprint.project.slug,
          clientName: sprint.project.client.name,
          sprintId: sprint.id,
          sprintNumber: sprint.number,
          sprintName: sprint.name,
          sprintGoal: sprint.goal,
          approvalNotes,
          previousSprintReview: previousSprint?.reviewSummary,
          handoffContent: sprintHandoffContent,
          backlogContent: backlogArtifact?.content,
          architectureContent: architectureArtifact?.content,
          projectPath,
        },
      });
      console.log(`[Sprints] Sent sprint/approved event for ${sprint.project.name} Sprint ${sprint.number}`);
    } catch (err) {
      console.error('[Sprints] Failed to send Inngest event:', err);
      // Don't fail the approval if event sending fails
    }

    // Sync knowledge base
    syncKnowledgeBase().catch(err => console.error('[Sprints] Knowledge sync failed:', err));

    return NextResponse.json({
      success: true,
      message: `Sprint ${sprint.number} approved and started`,
      sprint: {
        id: updatedSprint.id,
        number: updatedSprint.number,
        name: updatedSprint.name,
        status: updatedSprint.status,
        startedAt: updatedSprint.startedAt,
      },
      projectPath,
      cliCommand: `cd "${projectPath}" && claude`,
    });
  } catch (error) {
    console.error('Failed to approve sprint:', error);
    return NextResponse.json(
      { error: 'Failed to approve sprint' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sprints/[id]/approve
 *
 * Reject a sprint approval (reset to PLANNED status for re-planning).
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
    const body = await request.json().catch(() => ({}));
    const { rejectionReason } = body;

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, ownerId: true, implementerId: true },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    if (!canAccessProject(sprint.project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (sprint.status !== 'AWAITING_APPROVAL') {
      return NextResponse.json(
        { error: `Sprint is not awaiting approval. Current status: ${sprint.status}` },
        { status: 400 }
      );
    }

    // Reset sprint to PLANNED for re-planning
    const updatedSprint = await prisma.sprint.update({
      where: { id },
      data: {
        status: 'PLANNED',
      },
    });

    // Emit event to notify about rejection
    try {
      await inngest.send({
        name: 'sprint/rejected',
        data: {
          projectId: sprint.projectId,
          projectName: sprint.project.name,
          sprintId: sprint.id,
          sprintNumber: sprint.number,
          sprintName: sprint.name,
          rejectionReason,
        },
      });
      console.log(`[Sprints] Sent sprint/rejected event for ${sprint.project.name} Sprint ${sprint.number}`);
    } catch (err) {
      console.error('[Sprints] Failed to send Inngest event:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Sprint ${sprint.number} rejected and reset to PLANNED`,
      sprint: {
        id: updatedSprint.id,
        number: updatedSprint.number,
        name: updatedSprint.name,
        status: updatedSprint.status,
      },
    });
  } catch (error) {
    console.error('Failed to reject sprint:', error);
    return NextResponse.json(
      { error: 'Failed to reject sprint' },
      { status: 500 }
    );
  }
}

/**
 * Build a complete handoff document for a specific sprint
 * This includes the full backlog and architecture content, not just references
 */
function buildSprintHandoff(
  sprintNumber: number,
  sprintName: string,
  sprintGoal: string,
  backlogContent: string,
  architectureContent: string,
  originalHandoff: string,
  previousSprintReview: string
): string {
  // Extract sprint-specific items from backlog
  const sprintSection = extractSprintFromBacklog(backlogContent, sprintNumber);

  return `# Sprint ${sprintNumber} Handoff: ${sprintName}

## Sprint Goal
${sprintGoal || 'See sprint backlog items below'}

${previousSprintReview ? `## Previous Sprint Review
${previousSprintReview}

---
` : ''}
## Sprint ${sprintNumber} Backlog Items

${sprintSection || 'No specific sprint items found in backlog. See full backlog below.'}

---

## Full Project Backlog (BACKLOG.md)

${backlogContent || 'Backlog not available'}

---

## Architecture (ARCHITECTURE.md)

${architectureContent || 'Architecture document not available'}

---

## Original Project Handoff Reference

${originalHandoff ? originalHandoff.substring(0, 2000) + (originalHandoff.length > 2000 ? '\n\n[Truncated - see original HANDOFF document for full details]' : '') : 'No original handoff document available'}
`;
}

/**
 * Extract sprint-specific section from backlog content
 */
function extractSprintFromBacklog(backlogContent: string, sprintNumber: number): string {
  if (!backlogContent) return '';

  // Try to find sprint-specific section
  const sprintPatterns = [
    new RegExp(`##\\s*Sprint\\s*${sprintNumber}[:\\s-]?[^#]*`, 'i'),
    new RegExp(`###\\s*Sprint\\s*${sprintNumber}[:\\s-]?[^#]*`, 'i'),
    new RegExp(`\\*\\*Sprint\\s*${sprintNumber}\\*\\*[^*]*`, 'i'),
  ];

  for (const pattern of sprintPatterns) {
    const match = backlogContent.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return '';
}
