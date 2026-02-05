import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { generateSprintPrompt, generateQuickPrompt, SprintPromptContext } from '@/lib/prompts/sprint-prompt';

/**
 * GET /api/sprints/[id]/prompt
 *
 * Generate a copy-paste-ready prompt for Claude Code implementation.
 * This enables human-controlled implementation with local testing.
 *
 * Query params:
 *   - format: 'full' (default) or 'quick' for a shorter version
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
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'full';

    // Get sprint with project and artifacts
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: true,
            artifacts: true,
            referenceDocuments: {
              select: { name: true, mimeType: true },
            },
          },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    const project = sprint.project;

    // Check access
    if (project.ownerId !== session.user.id && project.implementerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get project type and intake data
    const projectType = ((project as { projectType?: string }).projectType || 'NEW_PROJECT') as 'NEW_PROJECT' | 'NEW_FEATURE' | 'BUG_FIX';
    const intakeData = project.intakeData as Record<string, unknown> || {};
    const targetCodebase = (project as { targetCodebase?: string }).targetCodebase;
    const bugDescription = (project as { bugDescription?: string }).bugDescription;

    // Get artifacts
    const backlogArtifact = project.artifacts.find(a => a.type === 'BACKLOG');
    const architectureArtifact = project.artifacts.find(a => a.type === 'ARCHITECTURE');

    // Build prompt context
    const context: SprintPromptContext = {
      projectName: project.name,
      projectSlug: project.slug,
      clientName: project.client.name,
      projectType,
      targetCodebase: targetCodebase || undefined,
      sprintNumber: sprint.number,
      sprintName: sprint.name || undefined,
      sprintGoal: sprint.goal || undefined,
      backlogContent: backlogArtifact?.content,
      architectureContent: architectureArtifact?.content,
      bugDescription: bugDescription || (intakeData.bugDescription as string) || undefined,
      stepsToReproduce: (intakeData.stepsToReproduce as string) || undefined,
      expectedBehavior: (intakeData.expectedBehavior as string) || undefined,
      featureDescription: (intakeData.featureDescription as string) || undefined,
      acceptanceCriteria: (intakeData.acceptanceCriteria as string) || undefined,
      referenceDocuments: project.referenceDocuments?.map(d => ({
        name: d.name,
        type: d.mimeType,
      })),
    };

    // Generate prompt
    const prompt = format === 'quick'
      ? generateQuickPrompt(context)
      : generateSprintPrompt(context);

    // Determine working directory for CLI command
    const workingDir = targetCodebase || project.slug;
    const cliCommand = `cd "C:\\tpml-ai-team\\projects\\${workingDir}" && claude`;

    return NextResponse.json({
      sprintId: sprint.id,
      sprintNumber: sprint.number,
      sprintName: sprint.name,
      projectName: project.name,
      projectType,
      format,
      prompt,
      cliCommand,
      workingDirectory: `C:\\tpml-ai-team\\projects\\${workingDir}`,
      instructions: [
        '1. Copy the prompt below',
        '2. Open a terminal in the working directory',
        '3. Run: claude',
        '4. Paste the prompt when Claude starts',
        '5. Review changes, test locally, then commit when satisfied',
      ],
    });
  } catch (error) {
    console.error('Failed to generate sprint prompt:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}
