import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { Inngest } from 'inngest';

const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/sprints/[id]/reinitiate
 *
 * Re-emit the sprint/approved event for the current active sprint.
 * Use this when the AI workflow stalled or didn't complete for the sprint.
 * Does not change sprint status — just re-triggers the workflow.
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

    if (sprint.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: `Sprint is not in progress. Current status: ${sprint.status}` },
        { status: 400 }
      );
    }

    // Determine project path
    const targetCodebase = (sprint.project as { targetCodebase?: string }).targetCodebase;
    const projectPath = targetCodebase
      ? `C:\\tpml-ai-team\\projects\\${targetCodebase}`
      : `C:\\tpml-ai-team\\projects\\${sprint.project.slug}`;

    // Build handoff content: prefer sprint-level, fall back to building it fresh
    const handoffArtifact = sprint.project.artifacts.find(a => a.type === 'HANDOFF');
    const backlogArtifact = sprint.project.artifacts.find(a => a.name === 'BACKLOG.md');
    const architectureArtifact = sprint.project.artifacts.find(a => a.name === 'ARCHITECTURE.md');

    // Get previous sprint's review for context
    const previousSprint = sprint.number > 1
      ? await prisma.sprint.findFirst({
          where: { projectId: sprint.projectId, number: sprint.number - 1 },
        })
      : null;

    // Use the sprint's stored handoff if available, otherwise build one
    const handoffContent = (sprint as { handoffContent?: string | null }).handoffContent
      || buildSprintHandoff(
        sprint.number,
        sprint.name || `Sprint ${sprint.number}`,
        sprint.goal || '',
        backlogArtifact?.content || '',
        architectureArtifact?.content || '',
        handoffArtifact?.content || '',
        previousSprint?.reviewSummary || ''
      );

    // Re-emit the sprint/approved event which triggers the full workflow
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
          handoffContent,
          backlogContent: backlogArtifact?.content,
          architectureContent: architectureArtifact?.content,
          projectPath,
        },
      });
      console.log(`[Sprint Reinitiate] Sent sprint/approved event for ${sprint.project.name} Sprint ${sprint.number}`);
    } catch (err) {
      console.error('[Sprint Reinitiate] Failed to send Inngest event:', err);
      return NextResponse.json(
        { error: 'Failed to send Inngest event', details: String(err) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sprint ${sprint.number} workflow reinitiated`,
      sprint: {
        id: sprint.id,
        number: sprint.number,
        name: sprint.name,
        status: sprint.status,
      },
    });
  } catch (error) {
    console.error('Sprint reinitiate failed:', error);
    return NextResponse.json(
      { error: 'Failed to reinitiate sprint' },
      { status: 500 }
    );
  }
}

/** Build a complete handoff document for a specific sprint */
function buildSprintHandoff(
  sprintNumber: number,
  sprintName: string,
  sprintGoal: string,
  backlogContent: string,
  architectureContent: string,
  originalHandoff: string,
  previousSprintReview: string
): string {
  const sprintSection = extractSprintFromBacklog(backlogContent, sprintNumber);

  return `# Sprint ${sprintNumber} Handoff: ${sprintName}

## Sprint Goal
${sprintGoal || 'See sprint backlog items below'}

${previousSprintReview ? `## Previous Sprint Review\n${previousSprintReview}\n\n---\n` : ''}
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

function extractSprintFromBacklog(backlogContent: string, sprintNumber: number): string {
  if (!backlogContent) return '';

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
