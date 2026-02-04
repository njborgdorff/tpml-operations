import { Inngest } from 'inngest';
import { prisma } from '@/lib/db/prisma';
import {
  success,
  notFound,
  validationError,
  internalError,
} from '@/lib/api/responses';

// Create Inngest client
const inngest = new Inngest({ id: 'tpml-code-team' });

/**
 * POST /api/workflow/implementation-complete
 *
 * Endpoint for external workers (e.g., Claude CLI) to signal that
 * implementation is complete. This triggers the workflow to continue
 * to the Reviewer step.
 *
 * Request body:
 * {
 *   projectId: string,       // Required: Project ID
 *   sprintNumber?: number,   // Optional: Sprint number
 *   output: string,          // Required: Implementation summary/output
 *   codeChanges?: string,    // Optional: Code diff or description
 *   filesModified?: string[], // Optional: List of files changed
 *   success?: boolean,       // Optional: Whether implementation succeeded (default true)
 *   iteration?: number,      // Optional: Iteration number (default 1)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.projectId) {
      return validationError('projectId is required');
    }

    if (!body.output) {
      return validationError('output is required - provide implementation summary');
    }

    const {
      projectId,
      sprintNumber,
      output,
      codeChanges,
      filesModified = [],
      success: implementationSuccess = true,
      iteration = 1,
    } = body;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        slug: true,
        name: true,
        sprints: {
          where: sprintNumber ? { number: sprintNumber } : { status: 'IN_PROGRESS' },
          take: 1,
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!project) {
      return notFound('Project');
    }

    const sprint = project.sprints[0];
    const actualSprintNumber = sprint?.number || sprintNumber || 1;

    // Send the completion event to Inngest
    await inngest.send({
      name: 'worker/implementation.complete',
      data: {
        projectId,
        projectSlug: project.slug,
        projectName: project.name,
        sprintNumber: actualSprintNumber,
        sprintId: sprint?.id,
        iteration,
        output,
        summary: output.substring(0, 1000),
        codeChanges: codeChanges || output,
        filesModified,
        success: implementationSuccess,
      },
    });

    // Log the completion
    console.log(`[Implementation Complete] Project: ${project.name}, Sprint: ${actualSprintNumber}, Files: ${filesModified.length}`);

    return success({
      message: 'Implementation completion signal sent',
      projectId,
      projectName: project.name,
      sprintNumber: actualSprintNumber,
      filesModified: filesModified.length,
      eventSent: 'worker/implementation.complete',
    });
  } catch (error) {
    console.error('Implementation complete endpoint failed:', error);
    return internalError('Failed to process implementation completion');
  }
}
