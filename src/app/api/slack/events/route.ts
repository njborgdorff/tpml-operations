/**
 * Slack Events Webhook
 *
 * Handles incoming events from Slack (messages, mentions, etc.)
 * and routes them to the appropriate Inngest functions.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { inngest } from '@/lib/inngest/client';

// ============================================================================
// Types
// ============================================================================

interface SlackEventPayload {
  type: 'url_verification' | 'event_callback';
  token?: string;
  challenge?: string;
  team_id?: string;
  api_app_id?: string;
  event?: SlackEvent;
  event_id?: string;
  event_time?: number;
}

interface SlackEvent {
  type: string;
  user?: string;
  channel?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  channel_type?: string;
  bot_id?: string;
  subtype?: string;
}

// ============================================================================
// Signature Verification
// ============================================================================

function verifySlackSignature(
  signature: string | null,
  timestamp: string | null,
  body: string
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('SLACK_SIGNING_SECRET not configured');
    return false;
  }

  // Check timestamp is within 5 minutes
  const requestTimestamp = parseInt(timestamp, 10);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - requestTimestamp) > 300) {
    console.error('Slack request timestamp too old');
    return false;
  }

  // Compute signature
  const sigBaseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(sigBaseString);
  const computedSignature = `v0=${hmac.digest('hex')}`;

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');

    // Parse payload first to check for URL verification
    const payload: SlackEventPayload = JSON.parse(body);

    // Handle URL verification (Slack setup) - respond immediately without signature check
    if (payload.type === 'url_verification') {
      console.log('[Slack Events] URL verification request received');
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Verify signature for all other requests in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifySlackSignature(signature, timestamp, body)) {
        console.error('Invalid Slack signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Handle event callbacks
    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event;

      // Ignore bot messages to prevent loops
      if (event.bot_id || event.subtype === 'bot_message') {
        return NextResponse.json({ ok: true });
      }

      // Route based on event type
      switch (event.type) {
        case 'app_mention':
          // Someone @mentioned our bot
          await inngest.send({
            name: 'codeteam/slack.message_received',
            data: {
              channelId: event.channel || '',
              userId: event.user || '',
              text: event.text || '',
              ts: event.ts || '',
              threadTs: event.thread_ts,
              eventType: 'mention',
            },
          });
          break;

        case 'message':
          // Message in a channel the bot is in
          if (event.channel_type === 'im') {
            // Direct message to bot
            await inngest.send({
              name: 'codeteam/slack.message_received',
              data: {
                channelId: event.channel || '',
                userId: event.user || '',
                text: event.text || '',
                ts: event.ts || '',
                threadTs: event.thread_ts,
                eventType: 'dm',
              },
            });
          } else {
            // Channel message - check if it mentions a bot (Slack sends as <@USERID>)
            const text = event.text || '';
            // Slack @mentions look like <@U12345678> - any user mention in channel triggers this
            const hasUserMention = /<@U[A-Z0-9]+>/i.test(text);

            if (hasUserMention) {
              console.log('[Slack Events] User mention detected in channel:', text);
              await inngest.send({
                name: 'codeteam/slack.message_received',
                data: {
                  channelId: event.channel || '',
                  userId: event.user || '',
                  text: text,
                  ts: event.ts || '',
                  threadTs: event.thread_ts,
                  eventType: 'role_mention',
                },
              });
            }
          }
          break;

        case 'reaction_added':
          // Someone reacted to a message - could be used for approvals
          // For now, just log it
          console.log('Reaction added:', event);
          break;

        default:
          console.log('Unhandled event type:', event.type);
      }
    }

    // Acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack events webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Required for Slack to POST
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
