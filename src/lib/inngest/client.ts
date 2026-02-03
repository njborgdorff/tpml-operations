/**
 * Inngest Client for TPML Operations
 *
 * Local Inngest client - no cross-project imports for build compatibility.
 */

import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({ id: 'tpml-code-team' });

// Helper to send events
export async function sendCodeTeamEvent(name: string, data: Record<string, unknown>) {
  return inngest.send({ name, data });
}
