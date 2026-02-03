import { getServerSession } from 'next-auth';
import { authOptions, canAccessProject } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { SprintStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  invalidTransition,
  internalError,
} from '@/lib/api/responses';
import {
  workflowTransitionSchema,
  validateInput,
} from '@/lib/validation/schemas';
import {
  type WorkflowStatus,
  type WorkflowRole,
  VALID_WORKFLOW_TRANSITIONS,
} from '@/types/shared';
import { RateLimiters, getRateLimitHeaders } from '@/lib/api/rate-limit';

/**
 * POST /api/workflow/transition
 *
 * Handle workflow transitions between roles.
 *
 * Valid transitions:
 * - IMPLEMENTING → REVIEWING (Implementer hands off to Reviewer)
 * - REVIEWING → TESTING (Reviewer approves → QA)
 * - REVIEWING → IMPLEMENTING (Reviewer requests changes)
 * - TESTING → AWAITING_APPROVAL (QA passes → PM acceptance)
 * - TESTING → IMPLEMENTING (QA finds bugs)
 * - AWAITING_APPROVAL → COMPLETED (PM accepts)
 * - AWAITING_APPROVAL → IMPLEMENTING (PM rejects)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    // Rate limiting
    const rateLimit = RateLimiters.workflowTransition(session.user.id);
    if (!rateLimit.success) {
      const response = validationError('Too many requests. Please try again later.');
      const headers = getRateLimitHeaders(rateLimit);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Validate request body
    const body = await request.json();
    const validation = validateInput(workflowTransitionSchema, body);

    if (!validation.success) {
      return validationError(validation.error!, validation.errors);
    }

    const {
      projectId,
      sprintId,
      fromStatus,
      toStatus,
      fromRole,
      toRole,
      decision,
      summary,
      handoffContent,
    } = validation.data!;

    // Validate project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, ownerId: true, implementerId: true, name: true },
    });

    if (!project) {
      return notFound('Project');
    }

    if (!canAccessProject(project, session.user.id)) {
      return forbidden();
    }

    // Validate transition using shared constants
    if (!VALID_WORKFLOW_TRANSITIONS[fromStatus]?.includes(toStatus)) {
      return invalidTransition(fromStatus, toStatus);
    }

    // Generate handoff filename
    const handoffFilename = `HANDOFF_${fromRole.toUpperCase()}_TO_${toRole.toUpperCase()}.md`;
    const timestamp = new Date().toISOString().split('T')[0];

    // Build handoff document if not provided
    const handoff = handoffContent || `# Handoff: ${fromRole} → ${toRole}

**Date:** ${timestamp}
**Project:** ${project.name}
**Sprint:** ${sprintId}

## Decision
**${decision}**

## Summary
${summary}

## Next Steps for ${toRole}
${getNextStepsForRole(toRole, decision)}
`;

    // Write handoff to project docs folder
    const projectPath = path.join('C:/tpml-ai-team/projects', project.slug);
    const docsPath = path.join(projectPath, 'docs');

    try {
      await fs.mkdir(docsPath, { recursive: true });
      await fs.writeFile(path.join(docsPath, handoffFilename), handoff);
    } catch (err) {
      console.error('Failed to write handoff file:', err);
      // Continue even if file write fails - we'll store in DB
    }

    // Store handoff as artifact
    await prisma.artifact.create({
      data: {
        projectId,
        type: 'HANDOFF',
        name: handoffFilename,
        content: handoff,
        version: 1,
      },
    });

    // Log the transition in conversations
    await prisma.conversation.create({
      data: {
        projectId,
        role: fromRole,
        type: 'workflow_transition',
        input: {
          fromStatus,
          toStatus,
          fromRole,
          toRole,
          decision,
        },
        output: {
          summary,
          handoffFilename,
          timestamp,
        },
      },
    });

    // Update sprint status if needed
    const sprintStatusMap: Record<WorkflowStatus, SprintStatus> = {
      IMPLEMENTING: SprintStatus.IN_PROGRESS,
      REVIEWING: SprintStatus.REVIEW,
      TESTING: SprintStatus.REVIEW,
      AWAITING_APPROVAL: SprintStatus.REVIEW,
      COMPLETED: SprintStatus.COMPLETED,
    };

    if (sprintStatusMap[toStatus]) {
      await prisma.sprint.update({
        where: { id: sprintId },
        data: {
          status: sprintStatusMap[toStatus],
          ...(toStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
      });
    }

    // If sprint completed, check for next sprint
    if (toStatus === 'COMPLETED') {
      const currentSprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        select: { number: true, projectId: true },
      });

      if (currentSprint) {
        const nextSprint = await prisma.sprint.findFirst({
          where: {
            projectId: currentSprint.projectId,
            number: currentSprint.number + 1,
          },
        });

        if (nextSprint) {
          // Start next sprint automatically
          await prisma.sprint.update({
            where: { id: nextSprint.id },
            data: {
              status: SprintStatus.IN_PROGRESS,
              startedAt: new Date(),
            },
          });
        } else {
          // All sprints done - mark project completed
          await prisma.project.update({
            where: { id: projectId },
            data: { status: 'COMPLETED' },
          });
        }
      }
    }

    return success({
      transition: {
        from: { status: fromStatus, role: fromRole },
        to: { status: toStatus, role: toRole },
        decision,
      },
      handoff: {
        filename: handoffFilename,
        stored: true,
      },
    });
  } catch (error) {
    console.error('Workflow transition failed:', error);
    return internalError('Failed to process workflow transition');
  }
}

function getNextStepsForRole(role: WorkflowRole, decision: string): string {
  const steps: Record<WorkflowRole, Record<string, string>> = {
    Implementer: {
      REQUEST_CHANGES: `- [ ] Review the issues identified
- [ ] Fix all critical and high priority issues
- [ ] Test changes locally
- [ ] Prepare updated handoff for Reviewer`,
      FIX_REQUIRED: `- [ ] Review the bugs found in QA
- [ ] Fix Critical bugs first, then High
- [ ] Retest locally
- [ ] Hand off back to QA for verification`,
      default: `- [ ] Review handoff
- [ ] Implement required changes
- [ ] Test locally
- [ ] Hand off to next role`,
    },
    Reviewer: {
      default: `- [ ] Review all changed files
- [ ] Check code quality and patterns
- [ ] Verify security considerations
- [ ] Check error handling
- [ ] Approve or request changes`,
    },
    QA: {
      default: `- [ ] Test against acceptance criteria
- [ ] Test edge cases and error scenarios
- [ ] Document any bugs found
- [ ] Prepare QA report
- [ ] Recommend accept or fix required`,
    },
    PM: {
      default: `- [ ] Review QA report
- [ ] Verify acceptance criteria
- [ ] Make acceptance decision
- [ ] Update project status`,
    },
  };

  return steps[role][decision] || steps[role].default || '- [ ] Review handoff and proceed';
}
