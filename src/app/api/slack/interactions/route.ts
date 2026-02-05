/**
 * Slack Interactions Webhook
 *
 * Handles interactive components (buttons, modals, etc.) from Slack.
 * Sends Inngest events directly to trigger workflows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Inngest } from 'inngest';
import { PrismaClient } from '@prisma/client';

// Initialize Inngest client
const inngest = new Inngest({ id: 'tpml-code-team' });

// Initialize Prisma client
const prisma = new PrismaClient();

// ============================================================================
// Types
// ============================================================================

interface SlackInteractionPayload {
  type: 'block_actions' | 'view_submission' | 'shortcut' | 'message_action';
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  message?: {
    ts: string;
    text: string;
    thread_ts?: string;
  };
  actions?: SlackAction[];
  trigger_id?: string;
  response_url?: string;
  view?: SlackView;
}

interface SlackAction {
  action_id: string;
  block_id: string;
  type: string;
  value?: string;
  selected_option?: {
    value: string;
    text: { type: string; text: string };
  };
}

interface SlackView {
  id: string;
  type: string;
  callback_id: string;
  state?: {
    values: Record<string, Record<string, { value?: string; selected_option?: { value: string } }>>;
  };
  private_metadata?: string;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  console.log('[Slack Interactions] Received request');

  try {
    // Get raw body
    const body = await request.text();
    console.log('[Slack Interactions] Body length:', body.length);

    // Parse payload (Slack sends it as form data)
    const params = new URLSearchParams(body);
    const payloadStr = params.get('payload');

    if (!payloadStr) {
      console.log('[Slack Interactions] Missing payload');
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const payload: SlackInteractionPayload = JSON.parse(payloadStr);
    console.log('[Slack Interactions] Payload type:', payload.type);
    console.log('[Slack Interactions] User:', payload.user?.username);

    // Handle view submissions (modals)
    if (payload.type === 'view_submission') {
      console.log('[Slack Interactions] View submission:', payload.view?.callback_id);
      return NextResponse.json({ response_action: 'clear' });
    }

    // Handle block actions (buttons, selects, etc.)
    if (payload.type === 'block_actions' && payload.actions) {
      for (const action of payload.actions) {
        console.log('[Slack Interactions] Action:', action.action_id);

        // Handle sprint approval/rejection
        if (action.action_id.startsWith('sprint_approve_') || action.action_id.startsWith('sprint_reject_')) {
          const isApproval = action.action_id.startsWith('sprint_approve_');
          const actionData = action.value ? JSON.parse(action.value) : {};
          const sprintId = actionData.sprintId;

          console.log(`[Slack Interactions] Sprint ${isApproval ? 'approval' : 'rejection'} for:`, sprintId);

          try {
            // Get sprint details from database
            const sprint = await prisma.sprint.findUnique({
              where: { id: sprintId },
              include: {
                project: {
                  include: { client: true, artifacts: true },
                },
              },
            });

            if (!sprint) {
              console.log('[Slack Interactions] Sprint not found:', sprintId);
              if (payload.response_url) {
                await fetch(payload.response_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    replace_original: false,
                    text: `❌ Sprint not found: ${sprintId}`,
                  }),
                });
              }
              continue;
            }

            if (sprint.status !== 'AWAITING_APPROVAL') {
              console.log('[Slack Interactions] Sprint not awaiting approval:', sprint.status);
              if (payload.response_url) {
                await fetch(payload.response_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    replace_original: false,
                    text: `⚠️ Sprint is not awaiting approval. Current status: ${sprint.status}`,
                  }),
                });
              }
              continue;
            }

            if (isApproval) {
              // Update sprint status to IN_PROGRESS
              await prisma.sprint.update({
                where: { id: sprintId },
                data: {
                  status: 'IN_PROGRESS',
                  startedAt: new Date(),
                },
              });

              // Get artifacts for handoff
              const backlogArtifact = sprint.project.artifacts.find(a => a.name === 'BACKLOG.md');
              const architectureArtifact = sprint.project.artifacts.find(a => a.name === 'ARCHITECTURE.md');
              const handoffArtifact = sprint.project.artifacts.find(a => a.type === 'HANDOFF');

              // Send sprint/approved event
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
                  approvalNotes: `Approved via Slack by ${payload.user.username}`,
                  backlogContent: backlogArtifact?.content,
                  architectureContent: architectureArtifact?.content,
                  handoffContent: handoffArtifact?.content,
                },
              });

              console.log(`[Slack Interactions] Sprint ${sprint.number} approved, event sent`);
            } else {
              // Update sprint status back to PLANNED
              await prisma.sprint.update({
                where: { id: sprintId },
                data: {
                  status: 'PLANNED',
                },
              });

              // Send sprint/rejected event
              await inngest.send({
                name: 'sprint/rejected',
                data: {
                  projectId: sprint.projectId,
                  projectName: sprint.project.name,
                  sprintId: sprint.id,
                  sprintNumber: sprint.number,
                  sprintName: sprint.name,
                  rejectionReason: `Rejected via Slack by ${payload.user.username}`,
                },
              });

              console.log(`[Slack Interactions] Sprint ${sprint.number} rejected, event sent`);
            }

            // Send acknowledgment to Slack
            if (payload.response_url) {
              const responseText = isApproval
                ? `✅ Sprint ${sprint.number} approved and started by <@${payload.user.id}>!\n\nThe Implementer will now begin working on this sprint.`
                : `⚠️ Sprint ${sprint.number} rejected by <@${payload.user.id}>.\n\nSprint has been reset to PLANNED for re-scoping.`;

              await fetch(payload.response_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  replace_original: false,
                  text: responseText,
                }),
              });
            }
          } catch (err) {
            console.error('[Slack Interactions] Error handling sprint action:', err);
            if (payload.response_url) {
              await fetch(payload.response_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  replace_original: false,
                  text: `❌ Error processing action: ${err instanceof Error ? err.message : 'Unknown error'}`,
                }),
              });
            }
          }
          continue;
        }

        // Handle handoff acknowledgment
        if (action.action_id.startsWith('handoff_ack_')) {
          const handoffId = action.action_id.replace('handoff_ack_', '');
          console.log('[Slack Interactions] Handoff acknowledged:', handoffId);

          if (payload.response_url) {
            await fetch(payload.response_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                replace_original: false,
                text: `✅ Handoff acknowledged by <@${payload.user.id}>`,
              }),
            });
          }
          continue;
        }

        // Handle other button actions with generic acknowledgment
        if (payload.response_url) {
          let responseText = `✅ Action received: ${action.action_id}`;

          if (action.action_id.includes('ack')) {
            responseText = `✅ Acknowledged by <@${payload.user.id}>`;
          } else if (action.action_id.includes('question')) {
            responseText = `❓ Question noted by <@${payload.user.id}>. Please respond in the thread.`;
          } else if (action.action_id.includes('feedback')) {
            responseText = `📝 Feedback requested by <@${payload.user.id}>. Please use the project page to submit feedback.`;
          }

          console.log('[Slack Interactions] Sending response to:', payload.response_url);

          const response = await fetch(payload.response_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              replace_original: false,
              text: responseText,
            }),
          });

          console.log('[Slack Interactions] Response status:', response.status);
        }
      }
    }

    // Acknowledge immediately (Slack requires response within 3 seconds)
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Slack Interactions] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Required for Slack to POST
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
