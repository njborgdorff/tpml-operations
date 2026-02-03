/**
 * Slack Interactions Webhook
 *
 * Handles interactive components (buttons, modals, etc.) from Slack.
 * Simplified version for testing without Inngest dependency.
 */

import { NextRequest, NextResponse } from 'next/server';

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

        // Send a response to Slack
        if (payload.response_url) {
          let responseText = `✅ Action received: ${action.action_id}`;

          if (action.action_id.includes('ack')) {
            responseText = `✅ Acknowledged by <@${payload.user.id}>`;
          } else if (action.action_id.includes('question')) {
            responseText = `❓ Question requested by <@${payload.user.id}>`;
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
