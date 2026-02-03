import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { syncKnowledgeBase } from '@/lib/knowledge/sync';
import { Inngest } from 'inngest';

// Initialize Inngest client for sending events
const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/projects/[id]/kickoff
 *
 * Starts implementation for an approved project.
 * Creates the handoff document and updates sprint status.
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

    // Get project with artifacts and sprints
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        artifacts: true,
        sprints: { orderBy: { number: 'asc' } },
        client: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (project.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Project must be approved before kickoff' },
        { status: 400 }
      );
    }

    // Check if already kicked off
    const existingHandoff = project.artifacts.find(a => a.type === 'HANDOFF');
    if (existingHandoff) {
      return NextResponse.json(
        { error: 'Project has already been kicked off' },
        { status: 400 }
      );
    }

    // Get artifacts content
    const backlogArtifact = project.artifacts.find(a => a.type === 'BACKLOG');
    const architectureArtifact = project.artifacts.find(a => a.type === 'ARCHITECTURE');

    if (!backlogArtifact || !architectureArtifact) {
      return NextResponse.json(
        { error: 'Missing required artifacts (BACKLOG or ARCHITECTURE)' },
        { status: 400 }
      );
    }

    // Determine project path for CLI commands
    const targetCodebase = (project as { targetCodebase?: string }).targetCodebase;
    const projectPath = targetCodebase
      ? `C:\\tpml-ai-team\\projects\\${targetCodebase}`
      : `C:\\tpml-ai-team\\projects\\${project.slug}`;

    // Generate handoff content
    const handoffContent = generateHandoffContent(
      project.name,
      backlogArtifact.content,
      architectureArtifact.content,
      project.approvalNotes || undefined
    );

    // Store handoff as artifact in database
    await prisma.artifact.create({
      data: {
        projectId: project.id,
        type: 'HANDOFF',
        name: 'HANDOFF_CTO_TO_IMPLEMENTER.md',
        content: handoffContent,
        version: 1,
      },
    });

    // Update first sprint status to IN_PROGRESS
    const firstSprint = project.sprints.find(s => s.number === 1);
    if (firstSprint) {
      await prisma.sprint.update({
        where: { id: firstSprint.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    // Update project status
    await prisma.project.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    // Sync knowledge base (fire and forget)
    syncKnowledgeBase().catch(err => console.error('[Kickoff] Knowledge sync failed:', err));

    // Emit Inngest event to trigger Slack notification and AI role invocation
    try {
      await inngest.send({
        name: 'project/kicked_off',
        data: {
          projectId: project.id,
          projectName: project.name,
          projectSlug: project.slug,
          clientName: project.client.name,
          sprintId: firstSprint?.id,
          sprintNumber: firstSprint?.number || 1,
          sprintName: firstSprint?.name || 'Sprint 1',
          handoffContent,
          projectPath,
        },
      });
      console.log(`[Kickoff] Sent project/kicked_off event for ${project.name}`);
    } catch (err) {
      console.error('[Kickoff] Failed to send Inngest event:', err);
      // Don't fail the kickoff if event sending fails
    }

    return NextResponse.json({
      success: true,
      message: 'Implementation started',
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: 'IN_PROGRESS',
      },
      sprint: firstSprint ? {
        id: firstSprint.id,
        number: firstSprint.number,
        name: firstSprint.name,
        status: 'IN_PROGRESS',
      } : null,
      projectPath,
      cliCommand: `cd "${projectPath}" && claude`,
      handoffCreated: true,
    });
  } catch (error) {
    console.error('Kickoff failed:', error);
    return NextResponse.json(
      { error: 'Failed to start implementation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/kickoff
 *
 * Get kickoff status and CLI commands for a project.
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
        artifacts: {
          orderBy: { createdAt: 'desc' },
        },
        sprints: {
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const handoffArtifact = project.artifacts.find(a => a.type === 'HANDOFF');
    const hasKickedOff = !!handoffArtifact;
    const activeSprint = project.sprints.find(s => s.status === 'IN_PROGRESS');

    // Determine project path
    const targetCodebase = (project as { targetCodebase?: string }).targetCodebase;
    const projectPath = targetCodebase
      ? `C:\\tpml-ai-team\\projects\\${targetCodebase}`
      : `C:\\tpml-ai-team\\projects\\${project.slug}`;

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      projectSlug: project.slug,
      status: project.status,
      approvalStatus: project.approvalStatus,
      hasKickedOff,
      projectPath,
      cliCommand: `cd "${projectPath}" && claude`,
      activeSprint: activeSprint ? {
        id: activeSprint.id,
        number: activeSprint.number,
        name: activeSprint.name,
        status: activeSprint.status,
        startedAt: activeSprint.startedAt,
      } : null,
      canKickoff: project.approvalStatus === 'APPROVED' && !hasKickedOff,
      sprints: project.sprints.map(s => ({
        id: s.id,
        number: s.number,
        name: s.name,
        status: s.status,
      })),
      handoffContent: handoffArtifact?.content || null,
    });
  } catch (error) {
    console.error('Failed to get kickoff status:', error);
    return NextResponse.json(
      { error: 'Failed to get kickoff status' },
      { status: 500 }
    );
  }
}

/**
 * Generate handoff document content
 */
function generateHandoffContent(
  projectName: string,
  backlogContent: string,
  architectureContent: string,
  ownerDecisions?: string
): string {
  const sprint1Items = extractSprint1Items(backlogContent);
  const techStack = extractTechStack(architectureContent);

  return `# Handoff: CTO → Implementer

**Date:** ${new Date().toISOString().split('T')[0]}
**Project:** ${projectName}

## Summary

Project approved by owner. Ready to begin Sprint 1 implementation.

${ownerDecisions ? `## Owner Decisions\n\n${ownerDecisions}\n\n` : ''}

## Backlog Reference

The full product backlog is available in BACKLOG.md. Focus on Sprint 1 items first.

Key Sprint 1 deliverables from the backlog:
${sprint1Items}

## Architecture Reference

The full architecture is available in ARCHITECTURE.md.

### Tech Stack Summary
${techStack}

## Action Items for Implementer

- [ ] Review BACKLOG.md for Sprint 1 requirements
- [ ] Review ARCHITECTURE.md for technical decisions
- [ ] Set up development environment if needed
- [ ] Implement Sprint 1 features in priority order
- [ ] Write tests for new functionality
- [ ] Update PROJECT_STATUS.md as you progress
- [ ] Create handoff to Reviewer when ready

## Implementation Notes

1. Follow existing code patterns and conventions
2. Implement features in priority order (P0 → P1 → P2)
3. Write unit tests alongside implementation
4. Keep commits atomic and well-described
5. Update docs as needed

## Next Steps

Begin with the highest priority Sprint 1 item. Focus on completing the MVP feature set.
`;
}

function extractSprint1Items(backlog: string): string {
  const sprint1Match = backlog.match(/### Sprint 1[^#]*([\s\S]*?)(?=### Sprint 2|---|\n## |$)/i);
  if (sprint1Match) {
    const items = sprint1Match[1]
      .split('\n')
      .filter(line => line.includes('|') && !line.includes('---') && !line.includes('ID'))
      .slice(0, 5)
      .map(line => `- ${line.split('|')[2]?.trim() || line}`)
      .join('\n');
    return items || '- See BACKLOG.md for details';
  }
  return '- See BACKLOG.md for details';
}

function extractTechStack(architecture: string): string {
  const stackMatch = architecture.match(/## Tech Stack[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|([\s\S]*?)(?=\n## |$)/i);
  if (stackMatch) {
    return stackMatch[0].substring(0, 500);
  }
  return '- See ARCHITECTURE.md for details';
}
