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
 * Optionally assigns an implementer who can view project documents.
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

    // Parse optional implementerId from request body
    const body = await request.json().catch(() => ({}));
    const { implementerId } = body;

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

    // Get project type (defaults to NEW_PROJECT for backwards compatibility)
    const projectType = (project as { projectType?: string }).projectType || 'NEW_PROJECT';
    const bugDescription = (project as { bugDescription?: string }).bugDescription;

    // Get artifacts content - requirements vary by project type
    const backlogArtifact = project.artifacts.find(a => a.type === 'BACKLOG');
    const architectureArtifact = project.artifacts.find(a => a.type === 'ARCHITECTURE');

    // NEW_PROJECT requires full planning artifacts
    // NEW_FEATURE and BUG_FIX can work with minimal/no planning artifacts
    if (projectType === 'NEW_PROJECT' && (!backlogArtifact || !architectureArtifact)) {
      return NextResponse.json(
        { error: 'Missing required artifacts (BACKLOG or ARCHITECTURE)' },
        { status: 400 }
      );
    }

    // Validate implementer if provided
    let implementer = null;
    if (implementerId) {
      implementer = await prisma.user.findUnique({
        where: { id: implementerId },
        select: { id: true, name: true, email: true },
      });

      if (!implementer) {
        return NextResponse.json(
          { error: 'Implementer user not found' },
          { status: 400 }
        );
      }
    }

    // Determine project path for CLI commands
    const targetCodebase = (project as { targetCodebase?: string }).targetCodebase;
    const projectPath = targetCodebase
      ? `C:\\tpml-ai-team\\projects\\${targetCodebase}`
      : `C:\\tpml-ai-team\\projects\\${project.slug}`;

    // Generate handoff content based on project type
    let handoffContent: string;
    const intakeData = project.intakeData as Record<string, unknown>;

    if (projectType === 'BUG_FIX') {
      handoffContent = generateBugFixHandoff(
        project.name,
        bugDescription || (intakeData?.bugDescription as string) || 'No bug description provided',
        (intakeData?.stepsToReproduce as string) || undefined,
        (intakeData?.expectedBehavior as string) || undefined,
        targetCodebase || project.slug
      );
    } else if (projectType === 'NEW_FEATURE') {
      handoffContent = generateFeatureHandoff(
        project.name,
        (intakeData?.featureDescription as string) || 'No feature description provided',
        (intakeData?.acceptanceCriteria as string) || undefined,
        targetCodebase || project.slug,
        architectureArtifact?.content
      );
    } else {
      // NEW_PROJECT - full handoff
      handoffContent = generateHandoffContent(
        project.name,
        backlogArtifact!.content,
        architectureArtifact!.content,
        project.approvalNotes || undefined
      );
    }

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

    // Update first sprint status to IN_PROGRESS and store handoff content
    const firstSprint = project.sprints.find(s => s.number === 1);
    if (firstSprint) {
      await prisma.sprint.update({
        where: { id: firstSprint.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), handoffContent },
      });
    }

    // Update project status and optionally assign implementer
    await prisma.project.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        ...(implementerId && { implementerId }),
      },
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
          projectType,
          bugDescription: bugDescription || (intakeData?.bugDescription as string),
          featureDescription: intakeData?.featureDescription as string,
          targetCodebase,
        },
      });
      console.log(`[Kickoff] Sent project/kicked_off event for ${project.name} (${projectType})`);
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
        implementerId: implementerId || null,
        implementer: implementer,
      },
      sprint: firstSprint ? {
        id: firstSprint.id,
        number: firstSprint.number,
        name: firstSprint.name,
        status: 'IN_PROGRESS',
      } : null,
      projectPath,
      cliCommand: `cd "${projectPath}" && claude`,
      handoffContent,
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

## Quick Reference - Sprint 1 Deliverables

${sprint1Items}

## Quick Reference - Tech Stack

${techStack}

## Action Items for Implementer

- [ ] Implement Sprint 1 features in priority order
- [ ] Write tests for new functionality
- [ ] Create handoff to Reviewer when ready

## Implementation Notes

1. Follow existing code patterns and conventions
2. Implement features in priority order (P0 → P1 → P2)
3. Write unit tests alongside implementation
4. Keep commits atomic and well-described

---

# FULL BACKLOG.md

The complete product backlog is provided below. Use this for Sprint 1 requirements.

${backlogContent}

---

# FULL ARCHITECTURE.md

The complete architecture document is provided below. Use this for technical decisions.

${architectureContent}

---

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

/**
 * Generate simplified handoff for bug fixes
 */
function generateBugFixHandoff(
  projectName: string,
  bugDescription: string,
  stepsToReproduce?: string,
  expectedBehavior?: string,
  codebase?: string
): string {
  return `# Bug Fix: ${projectName}

**Date:** ${new Date().toISOString().split('T')[0]}
**Type:** BUG_FIX
**Codebase:** ${codebase || 'TBD'}

## Bug Description

${bugDescription}

${stepsToReproduce ? `## Steps to Reproduce\n\n${stepsToReproduce}\n` : ''}
${expectedBehavior ? `## Expected Behavior\n\n${expectedBehavior}\n` : ''}

## Action Items for Implementer

1. **Identify the bug location** - Search the codebase for relevant code
2. **Understand the issue** - Reproduce if possible, trace the code path
3. **Implement the fix** - Make minimal, targeted changes
4. **Test the fix** - Verify the bug is resolved and no regressions
5. **Create PR** - Submit for review with clear description

## Guidelines

- Keep changes minimal and focused on the bug
- Don't refactor unrelated code
- Add regression tests if appropriate
- Document any non-obvious fixes with comments

---

*This is a simplified workflow for bug fixes. Proceed directly to implementation.*
`;
}

/**
 * Generate simplified handoff for new features
 */
function generateFeatureHandoff(
  projectName: string,
  featureDescription: string,
  acceptanceCriteria?: string,
  codebase?: string,
  architectureContent?: string
): string {
  return `# Feature: ${projectName}

**Date:** ${new Date().toISOString().split('T')[0]}
**Type:** NEW_FEATURE
**Codebase:** ${codebase || 'TBD'}

## Feature Description

${featureDescription}

${acceptanceCriteria ? `## Acceptance Criteria\n\n${acceptanceCriteria}\n` : ''}

## Action Items for Implementer

1. **Review existing code** - Understand the patterns and conventions
2. **Plan the implementation** - Identify files to modify/create
3. **Implement the feature** - Follow existing patterns
4. **Write tests** - Cover the new functionality
5. **Create PR** - Submit for review

## Guidelines

- Follow existing code patterns and conventions
- Maintain consistency with the current architecture
- Add appropriate tests
- Update documentation if needed

${architectureContent ? `---\n\n# Reference: Architecture Notes\n\n${architectureContent.substring(0, 1500)}\n` : ''}

---

*This is a feature addition to an existing codebase. Follow existing patterns.*
`;
}
