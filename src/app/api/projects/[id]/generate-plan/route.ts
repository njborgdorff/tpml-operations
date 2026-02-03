import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { runPlanningWorkflow } from '@/lib/ai/workflow';
import type { IntakeData } from '@/types';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get project with intake data
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canAccessProject(project, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update status to PLANNING
    await prisma.project.update({
      where: { id },
      data: { status: 'PLANNING' },
    });

    // Run the AI planning workflow
    const result = await runPlanningWorkflow(project.intakeData as IntakeData);

    // Store results and update status
    await prisma.project.update({
      where: { id },
      data: {
        pmPlan: JSON.parse(JSON.stringify(result.pmPlan)),
        ctoArchitecture: JSON.parse(JSON.stringify(result.ctoArchitecture)),
        summary: result.summary,
        status: 'REVIEW',
      },
    });

    // Log conversations for continuity
    await prisma.conversation.createMany({
      data: [
        {
          projectId: id,
          role: 'pm',
          type: 'planning',
          input: project.intakeData as object,
          output: result.pmPlan as object,
        },
        {
          projectId: id,
          role: 'cto',
          type: 'planning',
          input: { intake: project.intakeData, pmPlan: result.pmPlan },
          output: result.ctoArchitecture as object,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      summary: result.summary,
      projectId: id,
    });

  } catch (error) {
    console.error('Plan generation failed:', error);

    // Try to get the project ID to revert status
    try {
      const { id } = await params;
      await prisma.project.update({
        where: { id },
        data: { status: 'INTAKE' },
      });
    } catch {
      // Ignore if we can't revert
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate plan' },
      { status: 500 }
    );
  }
}
