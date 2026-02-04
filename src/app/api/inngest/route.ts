/**
 * Inngest Serve Endpoint
 *
 * This route serves Inngest functions for the TPML Code Team.
 * Uses individual role bot tokens for native @mentions.
 * Uses Claude API for intelligent role-based responses.
 *
 * Inngest Dev Server: npx inngest-cli@latest dev -u http://localhost:3001/api/inngest
 */

import { serve } from 'inngest/next';
import { Inngest } from 'inngest';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { invokeClaudeCode, buildRolePrompt } from '@/lib/orchestration/claude-code';

// Retry configuration for resilient autonomous workflows
const WORKFLOW_RETRY_CONFIG = {
  retries: 3 as const,
  backoff: {
    type: 'exponential' as const,
    minDelay: 2000,  // 2 seconds
    maxDelay: 30000, // 30 seconds
  },
};

// Create Inngest client
const inngest = new Inngest({ id: 'tpml-code-team' });

// Prisma client for database access
const prisma = new PrismaClient();

// ============================================================================
// Role Bot Token Mapping
// ============================================================================

// Code team roles
type CodeTeamRole = 'PM' | 'Architect' | 'Implementer' | 'Developer' | 'Reviewer' | 'QA' | 'Tester' | 'DevOps';

// Executive roles
type ExecutiveRole = 'CTO' | 'CMO' | 'COO' | 'CFO';

// All AI team roles
type AITeamRole = CodeTeamRole | ExecutiveRole;

function getRoleToken(role: AITeamRole): string {
  const tokens: Record<AITeamRole, string | undefined> = {
    // Code team
    PM: process.env.SLACK_BOT_TOKEN_PM,
    Architect: process.env.SLACK_BOT_TOKEN_ARCHITECT,
    Implementer: process.env.SLACK_BOT_TOKEN_IMPLEMENTER,
    Developer: process.env.SLACK_BOT_TOKEN_DEVELOPER,
    Reviewer: process.env.SLACK_BOT_TOKEN_REVIEWER,
    QA: process.env.SLACK_BOT_TOKEN_QA,
    Tester: process.env.SLACK_BOT_TOKEN_TESTER,
    DevOps: process.env.SLACK_BOT_TOKEN_DEVOPS,
    // Executives
    CTO: process.env.SLACK_BOT_TOKEN_CTO,
    CMO: process.env.SLACK_BOT_TOKEN_CMO,
    COO: process.env.SLACK_BOT_TOKEN_COO,
    CFO: process.env.SLACK_BOT_TOKEN_CFO,
  };

  // Fall back to main token if role token not configured
  return tokens[role] || process.env.SLACK_BOT_TOKEN || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlackBlock = Record<string, unknown>;

async function postAsRole(
  role: AITeamRole,
  channel: string,
  text: string,
  blocks?: SlackBlock[],
  threadTs?: string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const token = getRoleToken(role);

  if (!token) {
    console.log(`[Slack] No token for role ${role}`);
    return { ok: false, error: 'No token' };
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text,
      blocks,
      thread_ts: threadTs,
    }),
  });

  return response.json();
}

// ============================================================================
// Test Functions (to verify setup works)
// ============================================================================

/**
 * Simple test function to verify Inngest is working
 */
const testFunction = inngest.createFunction(
  { id: 'test-function', name: 'Test Function' },
  { event: 'test/hello' },
  async ({ event, step }) => {
    const greeting = await step.run('create-greeting', async () => {
      return `Hello, ${event.data.name || 'World'}!`;
    });

    console.log('[Inngest] Test function executed:', greeting);
    return { greeting };
  }
);

/**
 * Slack handoff notification - posts from the sending role's bot
 */
const postHandoffToSlack = inngest.createFunction(
  {
    id: 'slack-post-handoff',
    name: 'Post Handoff to Slack',
  },
  { event: 'codeteam/handoff.created' },
  async ({ event, step }) => {
    const { projectId, fromRole, toRole, handoffId } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Post handoff message from the sending role's bot
    const result = await step.run('post-handoff-from-role', async () => {
      return postAsRole(
        fromRole as CodeTeamRole,
        channel,
        `Handoff: ${fromRole} → ${toRole}`,
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🔄 Handing off to ${toRole}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Project:* ${projectId}\n*Handoff ID:* \`${handoffId}\``,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `I've completed my work and am handing off to *${toRole}*.`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Acknowledge', emoji: true },
                action_id: `handoff_ack_${handoffId}`,
                style: 'primary',
                value: JSON.stringify({ handoffId, fromRole, toRole, projectId }),
              },
            ],
          },
        ]
      );
    });

    // Post acknowledgment from the receiving role's bot
    if (result.ok && result.ts) {
      await step.run('post-ack-from-receiving-role', async () => {
        return postAsRole(
          toRole as CodeTeamRole,
          channel,
          `Acknowledged handoff from ${fromRole}`,
          [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `👋 Got it, *${fromRole}*! I'm picking this up now.`,
              },
            },
          ],
          result.ts // Reply in thread
        );
      });
    }

    console.log('[Inngest] Posted handoff to Slack:', result);
    return { posted: true, handoffId };
  }
);

/**
 * Task update notification - posts from the role that completed it
 */
const postTaskUpdateToSlack = inngest.createFunction(
  {
    id: 'slack-post-task-update',
    name: 'Post Task Update to Slack',
  },
  { event: 'codeteam/task.completed' },
  async ({ event, step }) => {
    const { taskId, projectId, role } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    await step.run('post-to-slack', async () => {
      return postAsRole(
        role as CodeTeamRole,
        channel,
        `Task completed`,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Task Completed*\n*Task:* \`${taskId}\`\n*Project:* ${projectId}`,
            },
          },
        ]
      );
    });

    return { posted: true, taskId };
  }
);

/**
 * Approval request - posts from the role requesting approval
 */
const requestApprovalViaSlack = inngest.createFunction(
  {
    id: 'slack-request-approval',
    name: 'Request Approval via Slack',
  },
  { event: 'codeteam/approval.requested' },
  async ({ event, step }) => {
    const { taskId, projectId, role, type } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    await step.run('post-approval-request', async () => {
      return postAsRole(
        role as CodeTeamRole,
        channel,
        `Approval requested for ${taskId}`,
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `⏳ ${type === 'review' ? 'Code Review' : 'Acceptance'} Required`,
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Task:* \`${taskId}\`\n*Project:* ${projectId}\n\nPlease review and approve or request changes.`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Approve', emoji: true },
                action_id: `approval_approve_${taskId}`,
                style: 'primary',
                value: JSON.stringify({ taskId, projectId }),
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Request Changes', emoji: true },
                action_id: `approval_changes_${taskId}`,
                value: JSON.stringify({ taskId, projectId }),
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Reject', emoji: true },
                action_id: `approval_reject_${taskId}`,
                style: 'danger',
                value: JSON.stringify({ taskId, projectId }),
              },
            ],
          },
        ]
      );
    });

    return { posted: true, taskId };
  }
);

/**
 * Role-to-role communication - one AI role messaging another
 */
const roleToRoleMessage = inngest.createFunction(
  {
    id: 'slack-role-to-role',
    name: 'Role to Role Message',
  },
  { event: 'codeteam/role.message' },
  async ({ event, step }) => {
    const { fromRole, toRole, projectId, message, threadTs } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Post message from the sending role
    await step.run('post-message', async () => {
      return postAsRole(
        fromRole as CodeTeamRole,
        channel,
        message,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*To ${toRole}:*\n${message}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Project: ${projectId}`,
              },
            ],
          },
        ],
        threadTs
      );
    });

    return { sent: true, fromRole, toRole };
  }
);

/**
 * Bug report notification
 */
const postBugReportToSlack = inngest.createFunction(
  {
    id: 'slack-post-bug-report',
    name: 'Post Bug Report to Slack',
  },
  { event: 'codeteam/bug.reported' },
  async ({ event, step }) => {
    const { bugId, projectId, severity, title } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Bug reports come from QA
    await step.run('post-bug-report', async () => {
      const severityMap: Record<string, string> = {
        Critical: '🔴',
        High: '🟠',
        Medium: '🟡',
        Low: '🟢',
      };
      const severityEmoji = severityMap[severity as string] || '⚪';

      return postAsRole(
        'QA',
        channel,
        `Bug reported: ${title}`,
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🐛 Bug Report: ${title}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Severity:* ${severityEmoji} ${severity}` },
              { type: 'mrkdwn', text: `*Bug ID:* \`${bugId}\`` },
              { type: 'mrkdwn', text: `*Project:* ${projectId}` },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Assign to Me', emoji: true },
                action_id: `bug_assign_${bugId}`,
                value: JSON.stringify({ bugId, projectId }),
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Details', emoji: true },
                action_id: `bug_view_${bugId}`,
                value: JSON.stringify({ bugId, projectId }),
              },
            ],
          },
        ]
      );
    });

    return { posted: true, bugId };
  }
);

// ============================================================================
// Executive Functions
// ============================================================================

/**
 * Executive escalation - when an issue needs executive attention
 */
const postEscalationToSlack = inngest.createFunction(
  {
    id: 'slack-post-escalation',
    name: 'Post Escalation to Slack',
  },
  { event: 'codeteam/escalation.created' },
  async ({ event, step }) => {
    const { escalationId, projectId, fromRole, toExecutive, reason, severity } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Post escalation from the role that's escalating
    const result = await step.run('post-escalation', async () => {
      const severityMap: Record<string, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };
      const severityEmoji = severityMap[severity as string] || '⚪';

      return postAsRole(
        fromRole as AITeamRole,
        channel,
        `Escalation to ${toExecutive}: ${reason}`,
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${severityEmoji} Escalation to ${toExecutive}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Project:* ${projectId}\n*Severity:* ${severity}\n*Reason:* ${reason}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Acknowledge', emoji: true },
                action_id: `escalation_ack_${escalationId}`,
                style: 'primary',
                value: JSON.stringify({ escalationId, fromRole, toExecutive, projectId }),
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Delegate', emoji: true },
                action_id: `escalation_delegate_${escalationId}`,
                value: JSON.stringify({ escalationId, fromRole, toExecutive, projectId }),
              },
            ],
          },
        ]
      );
    });

    // Executive acknowledges
    if (result.ok && result.ts) {
      await step.run('executive-ack', async () => {
        return postAsRole(
          toExecutive as ExecutiveRole,
          channel,
          `Acknowledged escalation from ${fromRole}`,
          [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `I'm reviewing this escalation. Will provide direction shortly.`,
              },
            },
          ],
          result.ts
        );
      });
    }

    return { posted: true, escalationId };
  }
);

/**
 * Executive directive - when an executive issues a directive to a team
 */
const postDirectiveToSlack = inngest.createFunction(
  {
    id: 'slack-post-directive',
    name: 'Post Directive to Slack',
  },
  { event: 'executive/directive.issued' },
  async ({ event, step }) => {
    const { directiveId, fromExecutive, toRoles, projectId, directive, priority } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    const priorityMap: Record<string, string> = {
      urgent: '🚨',
      high: '⚡',
      normal: '📋',
    };
    const priorityEmoji = priorityMap[priority as string] || '📋';

    // Post directive from the executive
    await step.run('post-directive', async () => {
      const targetRoles = Array.isArray(toRoles) ? toRoles.join(', ') : toRoles;

      return postAsRole(
        fromExecutive as ExecutiveRole,
        channel,
        `Directive: ${directive}`,
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${priorityEmoji} Executive Directive`,
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*To:* ${targetRoles}\n*Project:* ${projectId}\n*Priority:* ${priority}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: directive as string,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Acknowledge', emoji: true },
                action_id: `directive_ack_${directiveId}`,
                style: 'primary',
                value: JSON.stringify({ directiveId, fromExecutive, toRoles, projectId }),
              },
            ],
          },
        ]
      );
    });

    return { posted: true, directiveId };
  }
);

/**
 * Status report request - executive requests status from team
 */
const requestStatusReport = inngest.createFunction(
  {
    id: 'slack-request-status',
    name: 'Request Status Report',
  },
  { event: 'executive/status.requested' },
  async ({ event, step }) => {
    const { requestId, fromExecutive, projectId, scope } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    await step.run('post-status-request', async () => {
      return postAsRole(
        fromExecutive as ExecutiveRole,
        channel,
        `Status report requested for ${projectId}`,
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📊 Status Report Requested',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Project:* ${projectId}\n*Scope:* ${scope || 'Full status'}\n\nPlease provide current status updates.`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Submit Status', emoji: true },
                action_id: `status_submit_${requestId}`,
                style: 'primary',
                value: JSON.stringify({ requestId, fromExecutive, projectId }),
              },
            ],
          },
        ]
      );
    });

    return { posted: true, requestId };
  }
);

// ============================================================================
// Message Handling - Respond to @mentions
// ============================================================================

/**
 * Map Slack user IDs to roles
 */
function getUserIdToRoleMap(): Record<string, AITeamRole> {
  return {
    // Code team
    [process.env.SLACK_BOT_USER_ID_PM || 'U0ACF8WDXM1']: 'PM',
    [process.env.SLACK_BOT_USER_ID_ARCHITECT || 'U0ACF97BPU3']: 'Architect',
    [process.env.SLACK_BOT_USER_ID_IMPLEMENTER || 'U0AD0JNMNCR']: 'Implementer',
    [process.env.SLACK_BOT_USER_ID_DEVELOPER || 'U0DEVELOPER']: 'Developer',
    [process.env.SLACK_BOT_USER_ID_REVIEWER || 'U0AD0JQRX9P']: 'Reviewer',
    [process.env.SLACK_BOT_USER_ID_QA || 'U0ACKL20N7Q']: 'QA',
    [process.env.SLACK_BOT_USER_ID_TESTER || 'U0AD0KBMXUZ']: 'Tester',
    [process.env.SLACK_BOT_USER_ID_DEVOPS || 'U0AC68W11HD']: 'DevOps',
    // Executives
    [process.env.SLACK_BOT_USER_ID_CTO || 'U0ACJLDR4J1']: 'CTO',
    [process.env.SLACK_BOT_USER_ID_COO || 'U0ACRM9BGSG']: 'COO',
    [process.env.SLACK_BOT_USER_ID_CMO || 'U0ACFMKKHKM']: 'CMO',
    [process.env.SLACK_BOT_USER_ID_CFO || 'U0ACJLT6NSZ']: 'CFO',
  };
}

/**
 * Extract mentioned role from message text using Slack user IDs
 */
function extractMentionedRole(text: string): AITeamRole | null {
  // Extract all user mentions from the text (format: <@U12345678>)
  const mentionPattern = /<@(U[A-Z0-9]+)>/gi;
  const userIdToRole = getUserIdToRoleMap();

  let match;
  while ((match = mentionPattern.exec(text)) !== null) {
    const userId = match[1];
    const role = userIdToRole[userId];
    if (role) {
      console.log(`[Slack] Found mention of ${role} (${userId})`);
      return role;
    }
  }

  return null;
}

/**
 * Role system prompts based on TPML role definitions
 */
function getRoleSystemPrompt(role: AITeamRole): string {
  const rolePrompts: Record<AITeamRole, string> = {
    PM: `You are the Project Manager for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to translate business requirements into actionable technical specifications, maintain project organization, and coordinate work across the AI team roles.

**You DO:**
- Translate business requirements into clear technical specifications
- Maintain the project backlog with prioritized, actionable work items
- Write feature specifications with acceptance criteria
- Track project status, blockers, and dependencies
- Coordinate handoffs between team roles
- Facilitate scope decisions and trade-off discussions

**You DO NOT:**
- Write production code (that's Implementer's job)
- Make architectural decisions (escalate to Architect)
- Approve code changes (that's Reviewer's job)
- Write or review tests (QA and Tester roles)

Communication style: Be concise and actionable. No fluff, clear next steps. Flag risks immediately. Always provide next recommended action.`,

    Architect: `You are the Architect for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to design technical solutions, create Architecture Decision Records (ADRs), and define system contracts and patterns.

**You DO:**
- Design system architecture and data models
- Create ADRs documenting technical decisions
- Define API contracts and integration patterns
- Assess technical debt and recommend solutions
- Review designs for scalability and maintainability
- Enforce architectural patterns and standards

**You DO NOT:**
- Write feature code (that's Implementer's job)
- Handle deployment (that's DevOps)
- Manage timelines or priorities (that's PM)

Tech Stack: Next.js 14, React 18, TypeScript, PostgreSQL + Prisma, NextAuth.js, Vercel

Communication style: Be precise and technical. Justify decisions with trade-offs. Reference patterns and best practices.`,

    Implementer: `You are the Implementer for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to write production code, implement features, and fix bugs following established patterns and standards.

**You DO:**
- Implement features according to specifications
- Fix bugs and handle error cases
- Write clean, maintainable code
- Create unit tests for your code
- Follow coding standards and patterns
- Create pull requests with clear descriptions

**You DO NOT:**
- Change architecture without Architect approval
- Merge your own code (needs Reviewer)
- Write e2e tests (that's Tester)
- Modify CI/CD (that's DevOps)
- Ask for documents that are already provided in your context
- Request handoff documents, backlogs, or specs when they appear in "Additional Context"

**CRITICAL - Document Handling:**
When a handoff document or project documentation appears in your context (especially under "Additional Context" or "Handoff Document"), you MUST:
1. USE that document directly - it contains everything you need
2. Reference specific details FROM the provided document in your response
3. NEVER ask for documents that are already provided
4. Begin outlining implementation steps based on what you received

Standards: TypeScript strict mode, Server Components default, co-located tests, Zod validation, conventional commits.

Communication style: Be practical and code-focused. When given documentation, summarize what you received and proceed with implementation planning. Hand off to Developer for actual coding.`,

    Developer: `You are the Developer for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to write actual production code using Claude Code CLI. You receive implementation plans from the Implementer and translate them into working code.

**You DO:**
- Write production code following the Implementer's plan
- Implement features according to specifications
- Fix bugs identified by Reviewer or QA
- Write unit tests alongside your code
- Follow coding standards and patterns from the codebase
- Create meaningful git commits as you work
- Use Claude Code CLI to make actual file changes

**You DO NOT:**
- Plan or design architecture (that's Implementer/Architect)
- Review code (that's Reviewer)
- Write e2e tests (that's Tester)
- Modify CI/CD (that's DevOps)
- Ask for clarification - just implement based on the plan provided

**CRITICAL - Autonomous Coding:**
When you receive a handoff from the Implementer:
1. Read the existing codebase to understand patterns
2. Implement the features as specified
3. Write tests for your changes
4. Commit your work with clear messages
5. Hand off to Reviewer when complete

Standards: TypeScript strict mode, Server Components default, co-located tests, Zod validation, conventional commits.

Communication style: Be code-focused and action-oriented. Show what you built, not what you plan to build.`,

    Reviewer: `You are the Reviewer for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to review code for quality, security, and adherence to standards.

**You DO:**
- Review code for correctness and edge cases
- Check for security vulnerabilities
- Assess performance implications
- Verify adherence to coding standards
- Provide constructive feedback
- Approve or request changes

**You DO NOT:**
- Write feature code
- Make architectural decisions
- Merge without required checks
- Write tests

Review checklist: Correctness, Security, Performance, Code Quality, Testing, Standards Compliance.

Communication style: Be thorough but constructive. Explain the "why" behind feedback. Praise good patterns.`,

    QA: `You are the QA Engineer for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to define test strategy, validate features against acceptance criteria, and ensure quality standards.

**You DO:**
- Define test strategies and test plans
- Validate features against acceptance criteria
- Document bugs with reproduction steps
- Manage test data and environments
- Sign off on releases
- Track quality metrics

**You DO NOT:**
- Write automated test code (that's Tester)
- Write feature code
- Make architectural decisions

Coverage targets: Unit 90%, Integration 80%, E2E 100% happy paths.

Communication style: Be detail-oriented. Document issues clearly with steps to reproduce. Focus on user impact.`,

    Tester: `You are the Tester for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to implement automated tests, maintain test infrastructure, and ensure test coverage.

**You DO:**
- Write automated tests (unit, integration, e2e)
- Maintain test infrastructure and fixtures
- Create test data generators
- Report on test coverage
- Fix flaky tests
- Execute test plans

**You DO NOT:**
- Write feature code
- Define test strategy (that's QA)
- Skip tests for convenience

Stack: Vitest (unit/integration), Playwright (e2e), MSW (mocking), Faker (data).

Communication style: Be systematic. Report results clearly. Identify patterns in failures.`,

    DevOps: `You are the DevOps Engineer for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to manage deployments, CI/CD pipelines, infrastructure, and system reliability.

**You DO:**
- Manage CI/CD pipelines
- Configure environments and infrastructure
- Execute database migrations
- Set up monitoring and alerting
- Manage secrets and configurations
- Deploy to staging and production

**You DO NOT:**
- Write feature code
- Make architectural decisions
- Deploy without required approvals

Infrastructure: Vercel (hosting), Neon (PostgreSQL), GitHub Actions (CI/CD), Sentry (errors).

Communication style: Be precise about environments and versions. Document changes. Prioritize reliability.`,

    CTO: `You are the CTO (Chief Technology Officer) for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to drive technical excellence, lead the engineering team, set technology strategy, and ensure all technical decisions support business objectives.

**You DO:**
- Direct the engineering team (PM, Architect, Implementer, Reviewer, QA, Tester, DevOps)
- Set technology strategy and standards
- Review and approve major architectural decisions
- Oversee infrastructure and reliability
- Optimize AI development workflows
- Resolve technical blockers

**You DO NOT:**
- Commit to timelines without COO alignment
- Approve spend beyond budget without CFO input
- Deploy without QA and review gates
- Make security exceptions without human approval

Communication style: Be strategic and decisive. Balance technical excellence with business needs. Delegate appropriately.`,

    CMO: `You are the CMO (Chief Marketing Officer) for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to lead marketing strategy, direct the marketing team, and drive brand and campaign initiatives.

**You DO:**
- Define marketing strategy and campaigns
- Direct marketing team (Content Strategist, Copywriter, Social Media Manager)
- Manage brand positioning and messaging
- Track marketing ROI and optimize spend
- Coordinate with sales and product teams

**You DO NOT:**
- Approve spend beyond budget without CFO input
- Make commitments without operational capacity (check with COO)
- Access customer data directly

Communication style: Be creative but data-driven. Focus on outcomes and ROI. Align marketing with business goals.`,

    COO: `You are the COO (Chief Operating Officer) for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to ensure operational excellence, coordinate across teams, optimize workflows, and monitor service delivery.

**You DO:**
- Coordinate resources across all client engagements
- Monitor SLAs and service delivery
- Optimize workflows and processes
- Manage the Analyst (direct report)
- Resolve cross-team conflicts and bottlenecks
- Track team performance and utilization

**You DO NOT:**
- Override technical decisions (defer to CTO)
- Approve budget changes (defer to CFO)
- Direct marketing strategy (defer to CMO)

Communication style: Be organized and process-oriented. Focus on efficiency and delivery. Anticipate and resolve conflicts.`,

    CFO: `You are the CFO (Chief Financial Officer) for TPML (Total Product Management, Ltd.), an AI-staffed organization.

Your role is to provide financial intelligence, track costs, analyze profitability, and support financial decision-making.

**You DO:**
- Track AI/API costs and optimize spend
- Analyze client profitability and billing
- Prepare financial forecasts and budgets
- Monitor financial health metrics
- Support QuickBooks integration and reporting

**You DO NOT:**
- Execute transactions (human executes all transactions)
- Approve expenses (you recommend, human approves)
- Access banking systems directly

Communication style: Be analytical and precise. Present data clearly. Highlight risks and opportunities. All recommendations require human approval for execution.`,
  };

  return rolePrompts[role] || `You are ${role} for TPML. Respond helpfully based on your role.`;
}

/**
 * Fetch project context from database for AI responses
 */
async function getProjectContext(): Promise<string> {
  try {
    // Get all projects with their clients and sprints
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        sprints: {
          orderBy: { number: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (projects.length === 0) {
      return 'No projects currently in the system.';
    }

    // Format project data for context
    const projectSummaries = projects.map(p => {
      const currentSprint = p.sprints[0];
      return `- **${p.name}** (${p.client.name}): Status: ${p.status}${currentSprint ? `, Sprint ${currentSprint.number}: ${currentSprint.status}` : ''}`;
    });

    return `## Current Projects (${projects.length} total)

${projectSummaries.join('\n')}

## Project Details Available
You can provide information about any of these projects when asked. Each project has intake data, PM plans, and architecture documents available.`;
  } catch (error) {
    console.error('[Database] Error fetching project context:', error);
    return 'Unable to fetch project data at this time.';
  }
}

/**
 * Fetch thread history from Slack for conversational context
 */
async function getThreadHistory(
  channelId: string,
  threadTs: string,
  limit: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !threadTs) {
    return [];
  }

  try {
    const response = await fetch(
      `https://slack.com/api/conversations.replies?channel=${channelId}&ts=${threadTs}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();

    if (!data.ok || !data.messages) {
      console.log('[Slack] Could not fetch thread history:', data.error);
      return [];
    }

    // Get the role-to-userId mapping (inverted)
    const userIdToRole = getUserIdToRoleMap();
    const roleUserIds = new Set(Object.keys(userIdToRole));

    // Convert Slack messages to Claude message format
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of data.messages) {
      // Skip the original message if it's the same as current
      if (msg.ts === threadTs && data.messages.length > 1) continue;

      // Clean the message text
      const cleanText = (msg.text || '').replace(/<@U[A-Z0-9]+>/gi, '').trim();
      if (!cleanText) continue;

      // Determine if this is from a bot (assistant) or user
      const isBot = msg.bot_id || roleUserIds.has(msg.user);

      messages.push({
        role: isBot ? 'assistant' : 'user',
        content: cleanText,
      });
    }

    // Return last N messages, excluding the current one (which we'll add separately)
    return messages.slice(0, -1);
  } catch (error) {
    console.error('[Slack] Error fetching thread history:', error);
    return [];
  }
}

/**
 * Read knowledge base files for additional context
 */
async function getKnowledgeContext(): Promise<string> {
  try {
    // For Vercel deployment, we'll include key knowledge inline
    // since we can't read the file system in serverless
    return `## Organizational Knowledge

**TPML Structure:**
- AI-staffed organization with human leadership retaining decision authority
- Four executives: CTO (engineering), CMO (marketing), COO (operations), CFO (finance)
- Engineering team under CTO: PM, Architect, Implementer, Reviewer, QA, Tester, DevOps

**Key Principles:**
- Bots not people — Prefer AI automation
- Knowledge is infrastructure — Document everything
- Human in the loop — AI proposes, human approves
- Stateless by default — Context persists via knowledge base

**Tech Stack:**
- Frontend: Next.js 14, React 18, Tailwind CSS
- Backend: Next.js API routes, PostgreSQL + Prisma
- Deployment: Vercel, Neon (database)
- AI: Claude API (Anthropic)`;
  } catch (error) {
    console.error('[Knowledge] Error loading knowledge context:', error);
    return '';
  }
}

// ============================================================================
// Knowledge Base - Save Learnings
// ============================================================================

type KnowledgeCategory = 'DECISION' | 'LESSON_LEARNED' | 'PROCEDURE' | 'CLIENT_INFO' | 'TECHNICAL' | 'INCIDENT';

interface KnowledgeExtraction {
  shouldSave: boolean;
  category?: KnowledgeCategory;
  title?: string;
  content?: string;
  tags?: string[];
}

/**
 * Use Claude to analyze if a conversation contains knowledge worth saving
 */
async function analyzeForKnowledge(
  role: AITeamRole,
  conversationContext: string,
  responseText: string
): Promise<KnowledgeExtraction> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const analysisPrompt = `Analyze this conversation and determine if it contains significant knowledge worth saving to the organizational knowledge base.

Knowledge should be saved when it includes:
- Important decisions and their rationale
- Lessons learned from problems or successes
- New procedures or process improvements
- Client preferences or requirements discovered
- Technical patterns, solutions, or gotchas
- Incident learnings or post-mortems

Conversation:
${conversationContext}

Response from ${role}:
${responseText}

Respond with a JSON object (no markdown):
{
  "shouldSave": boolean,
  "category": "DECISION" | "LESSON_LEARNED" | "PROCEDURE" | "CLIENT_INFO" | "TECHNICAL" | "INCIDENT" (only if shouldSave is true),
  "title": "Brief title for the knowledge entry" (only if shouldSave is true),
  "content": "The knowledge to save, written as a clear, reusable reference" (only if shouldSave is true),
  "tags": ["relevant", "tags"] (only if shouldSave is true)
}

Be selective - only save genuinely valuable, reusable knowledge, not routine conversation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      // Parse JSON response
      const parsed = JSON.parse(textBlock.text);
      return parsed as KnowledgeExtraction;
    }
  } catch (error) {
    console.error('[Knowledge] Error analyzing for knowledge:', error);
  }

  return { shouldSave: false };
}

/**
 * Save a knowledge entry to the database
 */
async function saveKnowledgeEntry(
  role: AITeamRole,
  extraction: KnowledgeExtraction,
  sourceType: string,
  projectId?: string
): Promise<{ id: string } | null> {
  if (!extraction.shouldSave || !extraction.category || !extraction.title || !extraction.content) {
    return null;
  }

  try {
    const entry = await prisma.knowledgeEntry.create({
      data: {
        category: extraction.category,
        title: extraction.title,
        content: extraction.content,
        tags: extraction.tags || [],
        sourceRole: role,
        sourceType,
        projectId,
        verified: false,
      },
    });

    console.log(`[Knowledge] Saved new entry: ${entry.title} (${entry.id})`);
    return { id: entry.id };
  } catch (error) {
    console.error('[Knowledge] Error saving entry:', error);
    return null;
  }
}

/**
 * Capture learnings from iteration cycles
 * This stores what was found wrong, what was fixed, and the outcome
 */
async function captureIterationLearning(params: {
  projectId: string;
  projectName: string;
  sprintNumber: number;
  iteration: number;
  sourceRole: 'Reviewer' | 'QA';
  issuesFound: string;
  fixApplied: string;
  codeOutput?: string;
  outcome: 'approved' | 'needs_more_work';
}): Promise<{ id: string } | null> {
  const { projectId, projectName, sprintNumber, iteration, sourceRole, issuesFound, fixApplied, codeOutput, outcome } = params;

  const title = `${sourceRole} Feedback - ${projectName} Sprint ${sprintNumber} (Iter ${iteration})`;
  const content = `## Issue Identified by ${sourceRole}
${issuesFound}

## Fix Applied by Implementer
${fixApplied}

${codeOutput ? `## Code Changes Summary
\`\`\`
${codeOutput.substring(0, 1000)}${codeOutput.length > 1000 ? '...' : ''}
\`\`\`

` : ''}## Outcome
${outcome === 'approved' ? '✅ Fix was approved' : '⚠️ Additional work needed'}

## Learnings
- Issue type: ${sourceRole === 'Reviewer' ? 'Code quality/review finding' : 'Bug/test failure'}
- Resolution: ${outcome === 'approved' ? 'Successfully addressed' : 'Required further iteration'}
- Sprint: ${sprintNumber}, Iteration: ${iteration}`;

  try {
    const entry = await prisma.knowledgeEntry.create({
      data: {
        category: 'LESSON_LEARNED',
        title,
        content,
        tags: [sourceRole.toLowerCase(), 'iteration', `sprint-${sprintNumber}`, outcome],
        sourceRole: 'Implementer',
        sourceType: 'iteration_learning',
        projectId,
        verified: false,
      },
    });

    console.log(`[Knowledge] Captured iteration learning: ${entry.title} (${entry.id})`);
    return { id: entry.id };
  } catch (error) {
    console.error('[Knowledge] Error capturing iteration learning:', error);
    return null;
  }
}

/**
 * Fetch recent knowledge entries for context
 */
async function getRecentKnowledge(limit: number = 5): Promise<string> {
  try {
    const entries = await prisma.knowledgeEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        title: true,
        category: true,
        content: true,
        sourceRole: true,
        createdAt: true,
      },
    });

    if (entries.length === 0) {
      return '';
    }

    const formatted = entries.map(e =>
      `### ${e.title} (${e.category})\n*Added by ${e.sourceRole} on ${e.createdAt.toISOString().split('T')[0]}*\n${e.content}`
    ).join('\n\n');

    return `## Recent Knowledge Base Entries\n\n${formatted}`;
  } catch (error) {
    console.error('[Knowledge] Error fetching recent entries:', error);
    return '';
  }
}

/**
 * Analyze a role's response to determine if they approved or found issues
 * Returns { approved: boolean, issues?: string }
 */
async function analyzeRoleDecision(
  role: 'Reviewer' | 'QA',
  response: string
): Promise<{ approved: boolean; issues?: string }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = role === 'Reviewer'
    ? `Analyze this code review response. Did the reviewer APPROVE the code or REQUEST CHANGES?

Response to analyze:
${response}

Reply with ONLY a JSON object (no markdown):
{"approved": true} if approved
{"approved": false, "issues": "brief summary of issues"} if changes requested`
    : `Analyze this QA testing response. Did QA PASS the tests or find BUGS?

Response to analyze:
${response}

Reply with ONLY a JSON object (no markdown):
{"approved": true} if tests passed
{"approved": false, "issues": "brief summary of bugs found"} if bugs found`;

  try {
    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = result.content[0].type === 'text' ? result.content[0].text : '';
    // Parse JSON from response, handling potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // Default to approved if parsing fails (to avoid infinite loops)
    console.warn(`[Decision] Could not parse ${role} decision, defaulting to approved`);
    return { approved: true };
  } catch (error) {
    console.error(`[Decision] Error analyzing ${role} decision:`, error);
    return { approved: true }; // Default to approved on error
  }
}

/**
 * Generate intelligent response using Claude API
 *
 * @param options.skipKnowledge - If true, skips fetching knowledge base entries.
 * @param options.skipThreadHistory - If true, skips fetching Slack thread history.
 *   Use both during kickoff to prevent learned patterns from overriding explicit instructions.
 */
async function generateRoleResponse(
  role: AITeamRole,
  messageText: string,
  channelId?: string,
  threadTs?: string,
  additionalContext?: string,
  options?: { skipKnowledge?: boolean; skipThreadHistory?: boolean }
): Promise<{ response: string; knowledgeSaved?: { id: string; title: string } }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const { skipKnowledge = false, skipThreadHistory = false } = options || {};

  // Clean the message text (remove the @mention)
  const cleanedMessage = messageText.replace(/<@U[A-Z0-9]+>/gi, '').trim();

  // Fetch context in parallel - optionally skip knowledge/thread to prevent learned patterns
  const [projectContext, knowledgeContext, recentKnowledge, threadHistory] = await Promise.all([
    getProjectContext(),
    skipKnowledge ? Promise.resolve('') : getKnowledgeContext(),
    skipKnowledge ? Promise.resolve('') : getRecentKnowledge(),
    (channelId && threadTs && !skipThreadHistory) ? getThreadHistory(channelId, threadTs) : Promise.resolve([]),
  ]);

  // Build enhanced system prompt with all context
  const systemPrompt = `${getRoleSystemPrompt(role)}

## Current Workspace Context

${projectContext}
${knowledgeContext ? `\n${knowledgeContext}` : ''}
${recentKnowledge ? `\n${recentKnowledge}` : ''}
${additionalContext ? `
## Additional Context

${additionalContext}
` : ''}
When responding, reference specific projects by name when relevant. You have access to real project data from the TPML Operations database.${!skipKnowledge ? ' You are participating in a Slack conversation and should maintain conversational context from the thread history.' : ''}
${!skipKnowledge ? '\nImportant: If you discover something valuable (a decision, lesson learned, procedure, technical insight), share it clearly so it can be captured in the knowledge base.' : ''}`;

  // Build messages array with thread history for conversational context
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...threadHistory,
    { role: 'user', content: cleanedMessage || 'Hello!' },
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    // Extract text from response
    const textBlock = response.content.find(block => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      const responseText = textBlock.text;

      // Build conversation context for knowledge analysis
      const conversationContext = threadHistory
        .map(m => `${m.role}: ${m.content}`)
        .join('\n') + `\nuser: ${cleanedMessage}`;

      // Analyze if this conversation should be saved to knowledge base
      const extraction = await analyzeForKnowledge(role, conversationContext, responseText);

      let knowledgeSaved: { id: string; title: string } | undefined;
      if (extraction.shouldSave) {
        const saved = await saveKnowledgeEntry(role, extraction, 'slack_conversation');
        if (saved && extraction.title) {
          knowledgeSaved = { id: saved.id, title: extraction.title };
        }
      }

      return { response: responseText, knowledgeSaved };
    }

    return { response: `Hello! I'm the ${role}. How can I help you?` };
  } catch (error) {
    console.error(`[Claude API] Error generating response for ${role}:`, error);
    return { response: `Hello! I'm the ${role}. I'm having trouble processing your request right now. Please try again.` };
  }
}

/**
 * Handle incoming Slack messages - respond when mentioned
 */
const handleSlackMessage = inngest.createFunction(
  {
    id: 'slack-handle-message',
    name: 'Handle Slack Message',
  },
  { event: 'codeteam/slack.message_received' },
  async ({ event, step }) => {
    const { channelId, text, ts, threadTs } = event.data;

    // Determine which role was mentioned
    const mentionedRole = await step.run('extract-role', async () => {
      return extractMentionedRole(text as string);
    });

    if (!mentionedRole) {
      console.log('[Slack] No role mentioned in message:', text);
      return { responded: false, reason: 'no_role_mentioned' };
    }

    // The thread timestamp to use for context (existing thread or start of new one)
    const contextThreadTs = (threadTs as string) || (ts as string);

    // Generate intelligent response using Claude API with thread context
    const result = await step.run('generate-response', async () => {
      return generateRoleResponse(
        mentionedRole,
        text as string,
        channelId as string,
        contextThreadTs
      );
    });

    // Post response from the mentioned role
    await step.run('post-response', async () => {
      return postAsRole(
        mentionedRole,
        channelId as string,
        result.response,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: result.response,
            },
          },
        ],
        contextThreadTs // Reply in thread
      );
    });

    // If knowledge was saved, add a subtle notification
    if (result.knowledgeSaved) {
      await step.run('notify-knowledge-saved', async () => {
        return postAsRole(
          mentionedRole,
          channelId as string,
          `Knowledge saved: ${result.knowledgeSaved!.title}`,
          [
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `📚 _Saved to knowledge base: "${result.knowledgeSaved!.title}"_`,
                },
              ],
            },
          ],
          contextThreadTs
        );
      });
    }

    console.log(`[Slack] ${mentionedRole} responded to message with AI-generated response (with thread context)`);
    return {
      responded: true,
      role: mentionedRole,
      hasThreadContext: !!threadTs,
      knowledgeSaved: result.knowledgeSaved,
    };
  }
);

// ============================================================================
// Scheduled Reports & Meetings (Cron Jobs)
// ============================================================================

/**
 * Generate a report using Claude API based on role and context
 */
async function generateScheduledReport(
  role: AITeamRole,
  reportType: string,
  projectData: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const reportPrompts: Record<string, string> = {
    daily_financial: `Generate a brief Daily Financial Pulse report. Include:
- Key financial metrics for today
- Any budget concerns or anomalies
- Cash flow status
Keep it concise (3-5 bullet points).`,

    daily_ops: `Generate a brief Daily Operations Summary. Include:
- Team utilization status
- Any blockers or escalations
- Cross-team coordination needs
Keep it concise (3-5 bullet points).`,

    daily_system_health: `Generate a brief Daily System Health report. Include:
- Deployment status (any recent deploys)
- Error rates and critical issues
- Infrastructure status
Keep it concise (3-5 bullet points).`,

    weekly_engineering: `Generate a Weekly Engineering Summary. Include:
- Sprint progress and velocity
- Key deliverables completed
- Technical debt addressed
- Upcoming priorities
- Any risks or blockers`,

    weekly_marketing: `Generate a Weekly Marketing Summary. Include:
- Campaign performance metrics
- Content published
- Social media engagement
- Upcoming campaigns
- Budget utilization`,

    weekly_ops: `Generate a Weekly Operations Report. Include:
- Resource utilization
- SLA compliance
- Process improvements made
- Cross-team coordination highlights
- Upcoming capacity needs`,

    weekly_financial: `Generate a Weekly Financial Summary. Include:
- Revenue and expenses overview
- Budget variance analysis
- Client profitability highlights
- Upcoming financial milestones
- Recommendations for human review`,
  };

  const prompt = reportPrompts[reportType] || 'Generate a brief status report.';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `${getRoleSystemPrompt(role)}

You are generating a scheduled report for the TPML team. Be concise, actionable, and data-driven.

Current Project Context:
${projectData}`,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return textBlock.text;
    }
    return 'Unable to generate report at this time.';
  } catch (error) {
    console.error(`[Report] Error generating ${reportType}:`, error);
    return 'Report generation failed. Please check system logs.';
  }
}

/**
 * Daily Financial Pulse - CFO at 9 AM
 */
const dailyFinancialPulse = inngest.createFunction(
  {
    id: 'daily-financial-pulse',
    name: 'Daily Financial Pulse (CFO)',
  },
  { cron: '0 9 * * 1-5' }, // 9 AM weekdays
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const projectContext = await getProjectContext();

    const report = await step.run('generate-report', async () => {
      return generateScheduledReport('CFO', 'daily_financial', projectContext);
    });

    await step.run('post-report', async () => {
      return postAsRole('CFO', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '💰 Daily Financial Pulse', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Generated ${new Date().toLocaleDateString()} by CFO_` },
          ],
        },
      ]);
    });

    return { posted: true, reportType: 'daily_financial' };
  }
);

/**
 * Daily Ops Summary - COO at 9:30 AM
 */
const dailyOpsSummary = inngest.createFunction(
  {
    id: 'daily-ops-summary',
    name: 'Daily Ops Summary (COO)',
  },
  { cron: '30 9 * * 1-5' }, // 9:30 AM weekdays
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const projectContext = await getProjectContext();

    const report = await step.run('generate-report', async () => {
      return generateScheduledReport('COO', 'daily_ops', projectContext);
    });

    await step.run('post-report', async () => {
      return postAsRole('COO', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📋 Daily Operations Summary', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Generated ${new Date().toLocaleDateString()} by COO_` },
          ],
        },
      ]);
    });

    return { posted: true, reportType: 'daily_ops' };
  }
);

/**
 * Daily System Health - CTO at 8:30 AM (before other reports)
 */
const dailySystemHealth = inngest.createFunction(
  {
    id: 'daily-system-health',
    name: 'Daily System Health (CTO)',
  },
  { cron: '30 8 * * 1-5' }, // 8:30 AM weekdays
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const projectContext = await getProjectContext();

    const report = await step.run('generate-report', async () => {
      return generateScheduledReport('CTO', 'daily_system_health', projectContext);
    });

    await step.run('post-report', async () => {
      return postAsRole('CTO', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🖥️ Daily System Health', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Generated ${new Date().toLocaleDateString()} by CTO_` },
          ],
        },
      ]);
    });

    return { posted: true, reportType: 'daily_system_health' };
  }
);

/**
 * Weekly Engineering Summary - CTO on Monday at 10 AM
 */
const weeklyEngineeringSummary = inngest.createFunction(
  {
    id: 'weekly-engineering-summary',
    name: 'Weekly Engineering Summary (CTO)',
  },
  { cron: '0 10 * * 1' }, // Monday 10 AM
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const projectContext = await getProjectContext();

    const report = await step.run('generate-report', async () => {
      return generateScheduledReport('CTO', 'weekly_engineering', projectContext);
    });

    await step.run('post-report', async () => {
      return postAsRole('CTO', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🛠️ Weekly Engineering Summary', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Week of ${new Date().toLocaleDateString()} | Generated by CTO_` },
          ],
        },
      ]);
    });

    return { posted: true, reportType: 'weekly_engineering' };
  }
);

/**
 * Weekly Marketing Summary - CMO on Monday at 10:30 AM
 */
const weeklyMarketingSummary = inngest.createFunction(
  {
    id: 'weekly-marketing-summary',
    name: 'Weekly Marketing Summary (CMO)',
  },
  { cron: '30 10 * * 1' }, // Monday 10:30 AM
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const projectContext = await getProjectContext();

    const report = await step.run('generate-report', async () => {
      return generateScheduledReport('CMO', 'weekly_marketing', projectContext);
    });

    await step.run('post-report', async () => {
      return postAsRole('CMO', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📣 Weekly Marketing Summary', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Week of ${new Date().toLocaleDateString()} | Generated by CMO_` },
          ],
        },
      ]);
    });

    return { posted: true, reportType: 'weekly_marketing' };
  }
);

/**
 * Weekly Ops Report - COO on Monday at 11 AM
 */
const weeklyOpsReport = inngest.createFunction(
  {
    id: 'weekly-ops-report',
    name: 'Weekly Operations Report (COO)',
  },
  { cron: '0 11 * * 1' }, // Monday 11 AM
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const projectContext = await getProjectContext();

    const report = await step.run('generate-report', async () => {
      return generateScheduledReport('COO', 'weekly_ops', projectContext);
    });

    await step.run('post-report', async () => {
      return postAsRole('COO', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📊 Weekly Operations Report', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Week of ${new Date().toLocaleDateString()} | Generated by COO_` },
          ],
        },
      ]);
    });

    return { posted: true, reportType: 'weekly_ops' };
  }
);

/**
 * Weekly Financial Summary - CFO on Monday at 11:30 AM
 */
const weeklyFinancialSummary = inngest.createFunction(
  {
    id: 'weekly-financial-summary',
    name: 'Weekly Financial Summary (CFO)',
  },
  { cron: '30 11 * * 1' }, // Monday 11:30 AM
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const projectContext = await getProjectContext();

    const report = await step.run('generate-report', async () => {
      return generateScheduledReport('CFO', 'weekly_financial', projectContext);
    });

    await step.run('post-report', async () => {
      return postAsRole('CFO', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '💵 Weekly Financial Summary', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Week of ${new Date().toLocaleDateString()} | Generated by CFO_` },
          ],
        },
      ]);
    });

    return { posted: true, reportType: 'weekly_financial' };
  }
);

/**
 * Daily Project Summary - PM at 5 PM (end of day recap)
 */
const dailyProjectSummary = inngest.createFunction(
  {
    id: 'daily-project-summary',
    name: 'Daily Project Summary (PM)',
  },
  { cron: '0 17 * * 1-5' }, // 5 PM weekdays
  async ({ step }) => {
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Get all projects
    const projects = await step.run('fetch-projects', async () => {
      return prisma.project.findMany({
        where: { status: { in: ['IN_PROGRESS', 'ACTIVE', 'REVIEW'] } },
        include: {
          client: true,
          sprints: { where: { status: 'IN_PROGRESS' }, take: 1 },
        },
      });
    });

    if (projects.length === 0) {
      return { posted: false, reason: 'no_active_projects' };
    }

    // Generate summary for each active project
    const summaries = projects.map(p => {
      const sprint = p.sprints[0];
      return `• *${p.name}* (${p.client.name}): ${p.status}${sprint ? ` - Sprint ${sprint.number}` : ''}`;
    }).join('\n');

    const report = `*End of Day Summary*\n\n${summaries}\n\n_${projects.length} active project(s)_`;

    await step.run('post-summary', async () => {
      return postAsRole('PM', channel, report, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📋 Daily Project Summary', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: report },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Generated ${new Date().toLocaleDateString()} at 5:00 PM by PM_` },
          ],
        },
      ]);
    });

    return { posted: true, projectCount: projects.length };
  }
);

// ============================================================================
// Project Lifecycle Events
// ============================================================================

/**
 * Handle project kickoff - notify team and invoke Implementer with Claude Code CLI
 */
const handleProjectKickoff = inngest.createFunction(
  {
    id: 'project-kickoff-handler',
    name: 'Handle Project Kickoff',
    ...WORKFLOW_RETRY_CONFIG,
  },
  { event: 'project/kicked_off' },
  async ({ event, step }) => {
    const {
      projectId,
      projectName,
      projectSlug,
      clientName,
      sprintId: _sprintId,
      sprintNumber,
      sprintName,
      handoffContent,
      projectPath,
    } = event.data;

    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Validate handoff content - if missing, revert project to planning stage
    if (!handoffContent || handoffContent.trim().length === 0) {
      console.error(`[Kickoff] CRITICAL: No handoff content for project ${projectName} (${projectId})`);

      // Revert project status back to PLANNING
      await step.run('revert-to-planning', async () => {
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'PLANNING' },
        });

        // Notify in Slack about the issue
        await postAsRole('CTO', channel, `Project ${projectName} kickoff failed`, [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Kickoff Failed: ${projectName}*\n\nNo handoff document content was provided. Project has been reverted to PLANNING status.\n\nPlease ensure the handoff document is generated before attempting kickoff again.`,
            },
          },
        ]);
      });

      return {
        success: false,
        projectId,
        projectName,
        error: 'Missing handoff content - project reverted to PLANNING',
      };
    }

    // Step 1: CTO announces project kickoff
    const kickoffMessage = await step.run('announce-kickoff', async () => {
      return postAsRole('CTO', channel, `Project kickoff: ${projectName}`, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚀 Project Kickoff', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${projectName}* for *${clientName}* is now in implementation!\n\n*Sprint ${sprintNumber}:* ${sprintName}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Project ID:*\n\`${projectId}\`` },
            { type: 'mrkdwn', text: `*Status:*\nIN_PROGRESS` },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Handoff from CTO to Implementer complete_` },
          ],
        },
      ]);
    });

    // Step 2: Post handoff summary
    await step.run('post-handoff-summary', async () => {
      // Extract key points from handoff for Slack
      const handoffSummary = handoffContent
        ? handoffContent.substring(0, 800) + (handoffContent.length > 800 ? '...' : '')
        : 'See HANDOFF document for details';

      return postAsRole('CTO', channel, 'Handoff document ready', [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📋 *Handoff: CTO → Implementer*\n\n\`\`\`${handoffSummary}\`\`\``,
          },
        },
      ], kickoffMessage?.ts);
    });

    // Step 3: Invoke Implementer role to acknowledge and begin work
    const implementerResponse = await step.run('invoke-implementer', async () => {
      // Build context with handoff document - handoffContent is guaranteed to exist at this point
      const implementerContext = `## HANDOFF DOCUMENT - USE THIS (DO NOT ASK FOR IT)

The complete handoff document is provided below. You MUST use this document directly.

---
${handoffContent}
---

END OF HANDOFF DOCUMENT`;

      const messagePrompt = `PROJECT KICKOFF: "${projectName}" - Sprint ${sprintNumber} (${sprintName})

YOUR HANDOFF DOCUMENT IS PROVIDED ABOVE in "Additional Context". It contains:
- Project summary and scope
- Architecture and tech stack details
- Sprint 1 backlog items and deliverables

INSTRUCTIONS:
1. Read the handoff document provided above (it's already in your context)
2. Summarize the KEY POINTS from the document you received (prove you read it)
3. List the Sprint 1 deliverables FROM the document
4. Outline your implementation approach and first steps

IMPORTANT: You are authorized to proceed. DO NOT ask for permission, confirmation, or approval to begin work. Human approval is only required at sprint review, not during implementation. Start working immediately based on the handoff document.

DO NOT ask for documents. DO NOT say you need more information. DO NOT ask "should I proceed?" - just proceed.`;

      return generateRoleResponse(
        'Implementer',
        messagePrompt,
        channel,
        kickoffMessage?.ts,
        implementerContext,
        { skipKnowledge: true, skipThreadHistory: true } // Skip learned patterns from knowledge & thread history
      );
    });

    // Step 4: Post Implementer's response
    await step.run('post-implementer-response', async () => {
      return postAsRole('Implementer', channel, implementerResponse.response, [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: implementerResponse.response },
        },
      ], kickoffMessage?.ts);
    });

    // Step 5: Notify if knowledge was captured
    if (implementerResponse.knowledgeSaved) {
      await step.run('notify-knowledge', async () => {
        return postAsRole('Implementer', channel, 'Knowledge saved', [
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `📚 _Saved to knowledge base: "${implementerResponse.knowledgeSaved!.title}"_` },
            ],
          },
        ], kickoffMessage?.ts);
      });
    }

    // =========================================================================
    // HANDOFF TO DEVELOPER FOR ACTUAL CODING
    // Implementer plans, Developer writes code using Claude Code CLI
    // =========================================================================

    // Determine project path - use provided path or construct from slug
    const effectiveProjectPath = projectPath || `C:\\tpml-ai-team\\projects\\${projectSlug}`;

    // Step 5b: Implementer hands off to Developer
    await step.run('implementer-to-developer-handoff', async () => {
      return postAsRole('Implementer', channel, 'Handing off to Developer for implementation', [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📋 *Handoff: Implementer → Developer*\n\nI've outlined the implementation plan above. Handing off to Developer to write the actual code.`,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Workflow: PLANNING → CODING_` },
          ],
        },
      ], kickoffMessage?.ts);
    });

    // Step 5c: Developer acknowledges and starts coding
    const developerResponse = await step.run('developer-acknowledges', async () => {
      return generateRoleResponse(
        'Developer',
        `You've received the implementation plan from the Implementer. Acknowledge the handoff and confirm you're starting to code.

Implementation Plan:
${implementerResponse.response}

Briefly confirm what you'll be implementing, then proceed with coding.`,
        channel,
        kickoffMessage?.ts,
        undefined,
        { skipKnowledge: false, skipThreadHistory: true }
      );
    });

    await step.run('post-developer-acknowledgment', async () => {
      return postAsRole('Developer', channel, developerResponse.response, [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: developerResponse.response },
        },
      ], kickoffMessage?.ts);
    });

    // Step 5d: Developer invokes Claude Code CLI to actually implement the code
    const codeResult = await step.run('developer-invoke-claude-code-cli', async () => {
      await postAsRole('Developer', channel, 'Starting autonomous implementation...', [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🛠️ *Starting Autonomous Coding*\n\nInvoking Claude Code CLI to implement Sprint ${sprintNumber} features...\n\n_Project path: \`${effectiveProjectPath}\`_`,
          },
        },
      ], kickoffMessage?.ts);

      try {
        // Build role-specific prompt with handoff context
        const codePrompt = await buildRolePrompt(effectiveProjectPath, 'developer', `
## Sprint ${sprintNumber} Implementation

## Implementer's Plan
${implementerResponse.response}

## Original Handoff
${handoffContent}

## Your Task

Implement the Sprint ${sprintNumber} features as outlined by the Implementer above.

1. Read existing code structure in the project
2. Implement the required features following existing patterns
3. Write appropriate tests for new functionality
4. Create meaningful git commits as you work
5. When done, create a summary of what you implemented

IMPORTANT: This is autonomous implementation. Proceed with coding - no human approval needed until sprint review.
`);

        // Invoke Claude Code CLI
        const result = await invokeClaudeCode({
          projectPath: effectiveProjectPath,
          prompt: codePrompt,
          role: 'developer',
          timeout: 600000, // 10 minutes for implementation
        });

        return {
          success: result.success,
          output: result.output,
          duration: result.duration,
          exitCode: result.exitCode,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Kickoff] Claude Code CLI failed: ${errorMessage}`);
        return {
          success: false,
          output: '',
          duration: 0,
          exitCode: -1,
          error: errorMessage,
        };
      }
    });

    // Post Claude Code results
    await step.run('post-code-result', async () => {
      if (codeResult.success) {
        const summary = codeResult.output.length > 1500
          ? codeResult.output.substring(codeResult.output.length - 1500)
          : codeResult.output;

        return postAsRole('Developer', channel, 'Implementation completed', [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Claude Code CLI Implementation Complete*\n\n_Duration: ${Math.round(codeResult.duration / 1000)}s_\n\n\`\`\`${summary.substring(0, 2000)}\`\`\``,
            },
          },
        ], kickoffMessage?.ts);
      } else {
        return postAsRole('Developer', channel, 'Implementation encountered issues', [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Claude Code CLI Encountered Issues*\n\n${codeResult.error || 'Unknown error'}\n\n_Will proceed with review cycle to identify and fix issues._`,
            },
          },
        ], kickoffMessage?.ts);
      }
    });

    // =========================================================================
    // AUTOMATED ROLE-TO-ROLE WORKFLOW WITH FEEDBACK LOOPS
    // After Implementer outlines their plan, continue through Review and QA
    // If issues are found, loop back to Implementer for fixes
    // Human approval only required at sprint completion
    // Max iterations to prevent infinite loops (increased for testing convergence)
    // =========================================================================

    const MAX_ITERATIONS = 10; // Increased from 3 for testing
    // Include Claude Code output in the implementation context for review
    let currentImplementation = codeResult.success
      ? `${implementerResponse.response}\n\n## Claude Code Implementation Output\n\n${codeResult.output}`
      : implementerResponse.response;
    let iteration = 0;
    let workflowComplete = false;

    while (!workflowComplete && iteration < MAX_ITERATIONS) {
      iteration++;
      const iterSuffix = iteration > 1 ? `-iter${iteration}` : '';

      // Step 6: Developer signals implementation complete, hands off to Reviewer
      await step.run(`developer-handoff${iterSuffix}`, async () => {
        const message = iteration === 1
          ? `✅ *Implementation Complete*\n\nI've completed the Sprint ${sprintNumber} implementation. Handing off to Reviewer for code review.`
          : `✅ *Fixes Complete (Iteration ${iteration})*\n\nI've addressed the feedback and completed the fixes. Handing off to Reviewer for re-review.`;

        return postAsRole('Developer', channel, 'Implementation complete, handing off to Reviewer', [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: message },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `_Workflow: CODING → REVIEWING${iteration > 1 ? ` (iteration ${iteration})` : ''}_` },
            ],
          },
        ], kickoffMessage?.ts);
      });

      // Step 7: Invoke Reviewer to review the implementation
      const reviewerResponse = await step.run(`invoke-reviewer${iterSuffix}`, async () => {
        const reviewContext = `## Implementation Summary from Developer${iteration > 1 ? ` (Iteration ${iteration})` : ''}

${currentImplementation}

## Your Task
Review the implementation. Check for:
- Code quality and patterns
- Security considerations
- Error handling
- Test coverage
- Adherence to TPML standards

You MUST make a clear decision:
- If implementation meets standards: State "APPROVED" clearly and explain why
- If issues found: State "CHANGES REQUESTED" and list specific issues`;

        return generateRoleResponse(
          'Reviewer',
          `Review Sprint ${sprintNumber} implementation for "${projectName}".${iteration > 1 ? ` This is iteration ${iteration} after previous feedback.` : ''}

Make a CLEAR DECISION: Either APPROVE to proceed to QA, or REQUEST CHANGES with specific issues listed.`,
          channel,
          kickoffMessage?.ts,
          reviewContext,
          { skipKnowledge: true, skipThreadHistory: true }
        );
      });

      // Step 8: Post Reviewer's response
      await step.run(`post-reviewer-response${iterSuffix}`, async () => {
        return postAsRole('Reviewer', channel, reviewerResponse.response, [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: reviewerResponse.response },
          },
        ], kickoffMessage?.ts);
      });

      // Step 9: Analyze Reviewer's decision
      const reviewDecision = await step.run(`analyze-review-decision${iterSuffix}`, async () => {
        return analyzeRoleDecision('Reviewer', reviewerResponse.response);
      });

      if (!reviewDecision.approved) {
        // Reviewer requested changes - loop back to Developer
        await step.run(`reviewer-requests-changes${iterSuffix}`, async () => {
          return postAsRole('Reviewer', channel, 'Changes requested', [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `⚠️ *Changes Requested*\n\n${reviewDecision.issues || 'Please address the issues mentioned above.'}\n\nSending back to Developer for fixes.`,
              },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `_Workflow: REVIEWING → CODING (iteration ${iteration})_` },
              ],
            },
          ], kickoffMessage?.ts);
        });

        // Developer addresses the feedback using Claude Code CLI
        const fixResponse = await step.run(`developer-fix${iterSuffix}`, async () => {
          const fixContext = `## Previous Implementation
${currentImplementation}

## Reviewer Feedback
${reviewerResponse.response}

## Issues to Address
${reviewDecision.issues || 'See reviewer feedback above'}`;

          // First, get a plan from the Developer
          const planResponse = await generateRoleResponse(
            'Developer',
            `The Reviewer has requested changes for Sprint ${sprintNumber}. Address the feedback and provide your fix approach.

IMPORTANT:
- Check the knowledge base for similar issues you've fixed before
- Fix the issues mentioned. DO NOT ask for clarification - just explain what you will fix.
- Learn from any previous iteration learnings in the knowledge base.`,
            channel,
            kickoffMessage?.ts,
            fixContext,
            { skipKnowledge: false, skipThreadHistory: true } // Enable knowledge reading to learn from previous iterations
          );

          return planResponse;
        });

        await step.run(`post-developer-fix-plan${iterSuffix}`, async () => {
          return postAsRole('Developer', channel, fixResponse.response, [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: fixResponse.response },
            },
          ], kickoffMessage?.ts);
        });

        // Now invoke Claude Code CLI to actually make the fixes
        const fixCodeResult = await step.run(`developer-invoke-claude-code-fix${iterSuffix}`, async () => {
          await postAsRole('Developer', channel, 'Implementing fixes with Claude Code CLI...', [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🔧 *Implementing Fixes (Iteration ${iteration})*\n\nInvoking Claude Code CLI to address reviewer feedback...`,
              },
            },
          ], kickoffMessage?.ts);

          try {
            const fixPrompt = await buildRolePrompt(effectiveProjectPath, 'developer', `
## Reviewer Feedback to Address

${reviewerResponse.response}

## Specific Issues
${reviewDecision.issues || 'See reviewer feedback above'}

## Your Task
Fix the issues identified by the Reviewer:
1. Read the code that needs to be fixed
2. Make the necessary changes to address each issue
3. Ensure your fixes don't introduce new problems
4. Commit your changes with clear messages

IMPORTANT: This is autonomous fixing. Proceed with implementing fixes - no human approval needed.
`);

            const result = await invokeClaudeCode({
              projectPath: effectiveProjectPath,
              prompt: fixPrompt,
              role: 'developer',
              timeout: 300000, // 5 minutes for fixes
            });

            return {
              success: result.success,
              output: result.output,
              duration: result.duration,
              error: result.error,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, output: '', duration: 0, error: errorMessage };
          }
        });

        // Post fix results
        await step.run(`post-fix-result${iterSuffix}`, async () => {
          if (fixCodeResult.success) {
            return postAsRole('Developer', channel, 'Fixes implemented', [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `✅ *Fixes Implemented*\n\n_Duration: ${Math.round(fixCodeResult.duration / 1000)}s_`,
                },
              },
            ], kickoffMessage?.ts);
          } else {
            return postAsRole('Developer', channel, 'Fix implementation had issues', [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `⚠️ *Fix Implementation Issues*\n\n${fixCodeResult.error || 'Unknown error'}`,
                },
              },
            ], kickoffMessage?.ts);
          }
        });

        // Capture iteration learning from reviewer feedback
        await step.run(`capture-reviewer-learning${iterSuffix}`, async () => {
          return captureIterationLearning({
            projectId,
            projectName,
            sprintNumber,
            iteration,
            sourceRole: 'Reviewer',
            issuesFound: reviewDecision.issues || reviewerResponse.response,
            fixApplied: fixResponse.response,
            codeOutput: fixCodeResult.output,
            outcome: 'needs_more_work', // Will be reviewed again
          });
        });

        currentImplementation = fixCodeResult.success
          ? `${fixResponse.response}\n\n## Fix Implementation Output\n\n${fixCodeResult.output}`
          : fixResponse.response;
        continue; // Loop back to review
      }

      // Capture successful review learning
      await step.run(`capture-review-success${iterSuffix}`, async () => {
        return captureIterationLearning({
          projectId,
          projectName,
          sprintNumber,
          iteration,
          sourceRole: 'Reviewer',
          issuesFound: 'No issues - code review passed',
          fixApplied: 'N/A - implementation met standards',
          outcome: 'approved',
        });
      });

      // Reviewer approved - proceed to QA
      await step.run(`reviewer-approves${iterSuffix}`, async () => {
        return postAsRole('Reviewer', channel, 'Review approved, handing off to QA', [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Code Review Approved*\n\nImplementation meets standards. Handing off to QA for testing.`,
            },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `_Workflow: REVIEWING → TESTING_` },
            ],
          },
        ], kickoffMessage?.ts);
      });

      // Step 10: Invoke QA to test
      const qaResponse = await step.run(`invoke-qa${iterSuffix}`, async () => {
        const qaContext = `## Implementation Summary
${currentImplementation}

## Review Summary
${reviewerResponse.response}

## Your Task
Test the implementation against acceptance criteria. Verify:
- All features work as specified
- Edge cases are handled
- No regressions introduced
- Performance is acceptable

You MUST make a clear decision:
- If all tests pass: State "PASSED" or "QA APPROVED" clearly
- If bugs found: State "BUGS FOUND" or "FAILED" and list specific issues`;

        return generateRoleResponse(
          'QA',
          `Sprint ${sprintNumber} for "${projectName}" has passed code review. Test the implementation.

Make a CLEAR DECISION: Either PASS the tests, or document BUGS FOUND with specific issues.`,
          channel,
          kickoffMessage?.ts,
          qaContext,
          { skipKnowledge: true, skipThreadHistory: true }
        );
      });

      // Step 11: Post QA's response
      await step.run(`post-qa-response${iterSuffix}`, async () => {
        return postAsRole('QA', channel, qaResponse.response, [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: qaResponse.response },
          },
        ], kickoffMessage?.ts);
      });

      // Step 12: Analyze QA's decision
      const qaDecision = await step.run(`analyze-qa-decision${iterSuffix}`, async () => {
        return analyzeRoleDecision('QA', qaResponse.response);
      });

      if (!qaDecision.approved) {
        // QA found bugs - loop back to Developer
        await step.run(`qa-finds-bugs${iterSuffix}`, async () => {
          return postAsRole('QA', channel, 'Bugs found', [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🐛 *Bugs Found*\n\n${qaDecision.issues || 'Please fix the issues mentioned above.'}\n\nSending back to Developer for fixes.`,
              },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `_Workflow: TESTING → CODING (iteration ${iteration})_` },
              ],
            },
          ], kickoffMessage?.ts);
        });

        // Developer fixes the bugs using Claude Code CLI
        const bugfixResponse = await step.run(`developer-bugfix${iterSuffix}`, async () => {
          const bugfixContext = `## Current Implementation
${currentImplementation}

## QA Bug Report
${qaResponse.response}

## Bugs to Fix
${qaDecision.issues || 'See QA report above'}`;

          // First, get a plan from the Developer
          const planResponse = await generateRoleResponse(
            'Developer',
            `QA found bugs in Sprint ${sprintNumber}. Explain your approach to fix these bugs.

IMPORTANT:
- Check the knowledge base for similar bugs you've fixed before
- Fix ALL bugs mentioned. DO NOT ask questions - just explain what you will fix.
- Learn from any previous iteration learnings in the knowledge base.`,
            channel,
            kickoffMessage?.ts,
            bugfixContext,
            { skipKnowledge: false, skipThreadHistory: true } // Enable knowledge reading to learn from previous iterations
          );

          return planResponse;
        });

        await step.run(`post-developer-bugfix-plan${iterSuffix}`, async () => {
          return postAsRole('Developer', channel, bugfixResponse.response, [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: bugfixResponse.response },
            },
          ], kickoffMessage?.ts);
        });

        // Now invoke Claude Code CLI to actually fix the bugs
        const bugfixCodeResult = await step.run(`developer-invoke-claude-code-bugfix${iterSuffix}`, async () => {
          await postAsRole('Developer', channel, 'Fixing bugs with Claude Code CLI...', [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🐛 *Fixing Bugs (Iteration ${iteration})*\n\nInvoking Claude Code CLI to address QA findings...`,
              },
            },
          ], kickoffMessage?.ts);

          try {
            const bugfixPrompt = await buildRolePrompt(effectiveProjectPath, 'developer', `
## QA Bug Report to Address

${qaResponse.response}

## Specific Bugs
${qaDecision.issues || 'See QA report above'}

## Your Task
Fix ALL bugs identified by QA:
1. Understand each bug from the QA report
2. Locate and fix the problematic code
3. Add tests to prevent regression
4. Commit your fixes with clear messages

IMPORTANT: This is autonomous bug fixing. Fix all issues - no human approval needed.
`);

            const result = await invokeClaudeCode({
              projectPath: effectiveProjectPath,
              prompt: bugfixPrompt,
              role: 'developer',
              timeout: 300000, // 5 minutes for bug fixes
            });

            return {
              success: result.success,
              output: result.output,
              duration: result.duration,
              error: result.error,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, output: '', duration: 0, error: errorMessage };
          }
        });

        // Post bugfix results
        await step.run(`post-bugfix-result${iterSuffix}`, async () => {
          if (bugfixCodeResult.success) {
            return postAsRole('Developer', channel, 'Bugs fixed', [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `✅ *Bugs Fixed*\n\n_Duration: ${Math.round(bugfixCodeResult.duration / 1000)}s_`,
                },
              },
            ], kickoffMessage?.ts);
          } else {
            return postAsRole('Developer', channel, 'Bug fix had issues', [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `⚠️ *Bug Fix Issues*\n\n${bugfixCodeResult.error || 'Unknown error'}`,
                },
              },
            ], kickoffMessage?.ts);
          }
        });

        // Capture iteration learning from QA feedback
        await step.run(`capture-qa-learning${iterSuffix}`, async () => {
          return captureIterationLearning({
            projectId,
            projectName,
            sprintNumber,
            iteration,
            sourceRole: 'QA',
            issuesFound: qaDecision.issues || qaResponse.response,
            fixApplied: bugfixResponse.response,
            codeOutput: bugfixCodeResult.output,
            outcome: 'needs_more_work', // Will be tested again
          });
        });

        currentImplementation = bugfixCodeResult.success
          ? `${bugfixResponse.response}\n\n## Bug Fix Output\n\n${bugfixCodeResult.output}`
          : bugfixResponse.response;
        continue; // Loop back to review
      }

      // Capture successful QA learning
      await step.run(`capture-qa-success${iterSuffix}`, async () => {
        return captureIterationLearning({
          projectId,
          projectName,
          sprintNumber,
          iteration,
          sourceRole: 'QA',
          issuesFound: 'No bugs found - all tests passed',
          fixApplied: 'N/A - implementation passed QA',
          outcome: 'approved',
        });
      });

      // QA passed - workflow complete!
      workflowComplete = true;

      await step.run(`qa-passes${iterSuffix}`, async () => {
        return postAsRole('QA', channel, 'QA passed, requesting human approval', [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *QA Testing Passed*\n\nAll tests passed. Sprint ${sprintNumber} is ready for human review and approval.`,
            },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `_Workflow: TESTING → AWAITING_APPROVAL_` },
            ],
          },
        ], kickoffMessage?.ts);
      });
    }

    // Check if we hit max iterations
    if (!workflowComplete) {
      await step.run('max-iterations-reached', async () => {
        return postAsRole('PM', channel, 'Workflow needs human intervention', [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Human Intervention Required*\n\nSprint ${sprintNumber} workflow reached maximum iterations (${MAX_ITERATIONS}) without completing. Please review and intervene manually.`,
            },
          },
        ], kickoffMessage?.ts);
      });

      return {
        success: false,
        projectId,
        projectName,
        error: 'Max iterations reached',
        iterations: iteration,
        messageTs: kickoffMessage?.ts,
      };
    }

    // Update sprint status to AWAITING_APPROVAL (human gate)
    await step.run('update-sprint-status', async () => {
      const sprint = await prisma.sprint.findFirst({
        where: { projectId, number: sprintNumber },
      });

      if (sprint) {
        await prisma.sprint.update({
          where: { id: sprint.id },
          data: { status: 'REVIEW' },
        });
      }
    });

    // PM announces sprint ready for approval
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await step.run('announce-ready-for-approval', async () => {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { slug: true },
      });

      return postAsRole('PM', channel, 'Sprint ready for human approval', [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🎯 Sprint Ready for Approval', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${projectName}* - Sprint ${sprintNumber} (${sprintName}) has completed the bot workflow:\n\n✅ Implementation complete\n✅ Code review passed\n✅ QA testing passed${iteration > 1 ? `\n\n_Completed in ${iteration} iteration(s)_` : ''}\n\n*Human approval is now required to proceed.*`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Approve Sprint', emoji: true },
              style: 'primary',
              url: `${baseUrl}/projects/${project?.slug || projectId}`,
            },
          ],
        },
      ], kickoffMessage?.ts);
    });

    console.log(`[Kickoff] Project ${projectName} workflow complete in ${iteration} iteration(s) - awaiting human approval`);

    return {
      success: true,
      projectId,
      projectName,
      workflowComplete: true,
      awaitingApproval: true,
      iterations: iteration,
      messageTs: kickoffMessage?.ts,
    };
  }
);

/**
 * Handle sprint completion - request human approval for next sprint
 */
const handleSprintCompleted = inngest.createFunction(
  {
    id: 'sprint-completed-handler',
    name: 'Handle Sprint Completion',
    ...WORKFLOW_RETRY_CONFIG,
  },
  { event: 'sprint/completed' },
  async ({ event, step }) => {
    const {
      projectId,
      projectName,
      completedSprintId,
      completedSprintNumber,
      completedSprintName,
      reviewSummary,
      nextSprintId,
      nextSprintNumber,
      nextSprintName,
      nextSprintGoal,
    } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Announce sprint completion and request approval
    await step.run('announce-completion', async () => {
      return postAsRole('PM', channel, `Sprint ${completedSprintNumber} complete - approval needed`, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '✅ Sprint Complete - Approval Required', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${projectName}* - Sprint ${completedSprintNumber} (${completedSprintName}) is complete!\n\n${reviewSummary ? `*Review Summary:*\n${reviewSummary.substring(0, 500)}${reviewSummary.length > 500 ? '...' : ''}` : '_No review summary available_'}`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Next Up:* Sprint ${nextSprintNumber} - ${nextSprintName}\n${nextSprintGoal ? `*Goal:* ${nextSprintGoal}` : ''}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏳ *Human approval required to start Sprint ${nextSprintNumber}*`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '📝 Provide Feedback', emoji: true },
              url: `${baseUrl}/projects/${projectId}?sprint=${completedSprintId}&feedback=true`,
              action_id: 'provide_feedback',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Approve & Start Sprint', emoji: true },
              style: 'primary',
              action_id: `sprint_approve_${nextSprintId}`,
              value: JSON.stringify({ sprintId: nextSprintId, projectId, action: 'approve' }),
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ Reject / Re-plan', emoji: true },
              style: 'danger',
              action_id: `sprint_reject_${nextSprintId}`,
              value: JSON.stringify({ sprintId: nextSprintId, projectId, action: 'reject' }),
            },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Provide feedback before approving • Sprint ${nextSprintNumber} is AWAITING_APPROVAL_` },
          ],
        },
      ]);
    });

    return { success: true, projectId, completedSprintNumber, awaitingApproval: nextSprintId };
  }
);

/**
 * Handle sprint approval - invoke Implementer for the new sprint
 */
const handleSprintApproved = inngest.createFunction(
  {
    id: 'sprint-approved-handler',
    name: 'Handle Sprint Approved',
    ...WORKFLOW_RETRY_CONFIG,
  },
  { event: 'sprint/approved' },
  async ({ event, step }) => {
    const {
      projectId,
      projectName,
      projectSlug,
      sprintId: _sprintId,
      sprintNumber,
      sprintName,
      sprintGoal,
      approvalNotes,
      previousSprintReview,
      handoffContent,
      projectPath: eventProjectPath,
    } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // Determine project path
    const projectPath = eventProjectPath || `C:\\tpml-ai-team\\projects\\${projectSlug || projectId}`;

    // Step 1: CTO announces sprint start
    const startMessage = await step.run('announce-sprint-start', async () => {
      return postAsRole('CTO', channel, `Sprint ${sprintNumber} approved and starting`, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚀 Sprint Approved & Starting', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${projectName}* - Sprint ${sprintNumber} (${sprintName}) is now in progress!\n\n${sprintGoal ? `*Sprint Goal:* ${sprintGoal}` : ''}${approvalNotes ? `\n\n*Approval Notes:* ${approvalNotes}` : ''}`,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Human-approved at ${new Date().toLocaleString()}_` },
          ],
        },
      ]);
    });

    // Step 2: Fetch comprehensive context from database
    const fullContext = await step.run('fetch-full-context', async () => {
      // Get previous sprint reviews and artifacts
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          sprints: {
            orderBy: { number: 'desc' },
            take: 3, // Last 3 sprints for context
            include: {
              reviews: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          artifacts: {
            where: {
              type: { in: ['BACKLOG', 'ARCHITECTURE', 'HANDOFF'] },
            },
            orderBy: { createdAt: 'desc' },
          },
          conversations: {
            where: {
              role: { in: ['Implementer', 'Reviewer', 'QA'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 5, // Recent role conversations
          },
        },
      });

      if (!project) return null;

      // Build comprehensive context
      const backlog = project.artifacts.find(a => a.type === 'BACKLOG');
      const architecture = project.artifacts.find(a => a.type === 'ARCHITECTURE');
      const latestHandoff = project.artifacts.find(a => a.type === 'HANDOFF');

      // Get learnings from previous sprints
      const previousSprintSummaries = project.sprints
        .filter(s => s.number < sprintNumber)
        .map(s => {
          const review = s.reviews[0];
          return `Sprint ${s.number} (${s.name}): ${s.status}${review ? ` - Review: ${JSON.stringify(review.conversationLog).substring(0, 300)}...` : ''}`;
        })
        .join('\n');

      return {
        backlogContent: backlog?.content || '',
        architectureContent: architecture?.content || '',
        handoffContent: latestHandoff?.content || handoffContent || '',
        previousSprintSummaries,
        recentConversations: project.conversations.map(c => ({
          role: c.role,
          output: typeof c.output === 'string' ? c.output.substring(0, 200) : JSON.stringify(c.output).substring(0, 200),
        })),
      };
    });

    // Step 3: Build enhanced context for Implementer
    const enhancedContext = await step.run('build-enhanced-context', async () => {
      let ctx = `# Sprint ${sprintNumber} Implementation Context

## Project: ${projectName}
## Sprint: ${sprintName}
${sprintGoal ? `## Goal: ${sprintGoal}` : ''}

${approvalNotes ? `## Owner Approval Notes\n${approvalNotes}\n` : ''}

${previousSprintReview ? `## Previous Sprint Review\n${previousSprintReview}\n` : ''}
`;

      if (fullContext) {
        if (fullContext.previousSprintSummaries) {
          ctx += `\n## Previous Sprint History\n${fullContext.previousSprintSummaries}\n`;
        }
        // Include full handoff (no truncation)
        if (fullContext.handoffContent) {
          ctx += `\n## Handoff Document\n${fullContext.handoffContent}\n`;
        }
        // Include relevant backlog section for this sprint
        if (fullContext.backlogContent) {
          const sprintSection = fullContext.backlogContent.match(
            new RegExp(`### Sprint ${sprintNumber}[^#]*([\s\S]*?)(?=### Sprint ${sprintNumber + 1}|---|\n## |$)`, 'i')
          );
          if (sprintSection) {
            ctx += `\n## Sprint ${sprintNumber} Backlog Items\n${sprintSection[1]}\n`;
          }
        }
      }

      return ctx;
    });

    // Step 4: Invoke Implementer to outline approach
    const implementerResponse = await step.run('invoke-implementer', async () => {
      return generateRoleResponse(
        'Implementer',
        `${enhancedContext}\n\nYou are starting Sprint ${sprintNumber}. Based on the context above:
1. Summarize the key deliverables for this sprint
2. Outline your implementation approach
3. Identify any dependencies or blockers

IMPORTANT: This is human-approved. Proceed with implementation planning - no further approval needed until sprint review. Hand off to Developer for coding.`,
        channel,
        startMessage?.ts,
        undefined,
        { skipKnowledge: true, skipThreadHistory: true }
      );
    });

    // Step 5: Post Implementer's response
    await step.run('post-implementer-response', async () => {
      return postAsRole('Implementer', channel, implementerResponse.response, [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: implementerResponse.response },
        },
      ], startMessage?.ts);
    });

    // Step 5b: Implementer hands off to Developer
    await step.run('implementer-to-developer-handoff-sprint', async () => {
      return postAsRole('Implementer', channel, 'Handing off to Developer for implementation', [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📋 *Handoff: Implementer → Developer*\n\nI've outlined the implementation plan above. Handing off to Developer to write the actual code.`,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Workflow: PLANNING → CODING_` },
          ],
        },
      ], startMessage?.ts);
    });

    // Step 5c: Developer acknowledges
    const developerResponse = await step.run('developer-acknowledges-sprint', async () => {
      return generateRoleResponse(
        'Developer',
        `You've received the implementation plan from the Implementer for Sprint ${sprintNumber}. Acknowledge the handoff and confirm you're starting to code.

Implementation Plan:
${implementerResponse.response}

Briefly confirm what you'll be implementing, then proceed with coding.`,
        channel,
        startMessage?.ts,
        undefined,
        { skipKnowledge: false, skipThreadHistory: true }
      );
    });

    await step.run('post-developer-acknowledgment-sprint', async () => {
      return postAsRole('Developer', channel, developerResponse.response, [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: developerResponse.response },
        },
      ], startMessage?.ts);
    });

    // Step 6: Developer invokes Claude Code CLI for actual implementation
    const codeResult = await step.run('developer-invoke-claude-code-sprint', async () => {
      await postAsRole('Developer', channel, 'Starting autonomous implementation...', [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🛠️ *Starting Sprint ${sprintNumber} Implementation*\n\nInvoking Claude Code CLI...\n\n_Project path: \`${projectPath}\`_`,
          },
        },
      ], startMessage?.ts);

      try {
        const codePrompt = await buildRolePrompt(projectPath, 'developer', `
## Sprint ${sprintNumber} Implementation

${enhancedContext}

## Implementer's Plan
${implementerResponse.response}

## Your Task
Implement Sprint ${sprintNumber} features:
1. Read existing code structure
2. Implement features per the backlog and plan
3. Write tests for new functionality
4. Create meaningful git commits
5. Summarize what you implemented

IMPORTANT: This is autonomous implementation. Proceed - no human approval needed until sprint review.
`);

        const result = await invokeClaudeCode({
          projectPath,
          prompt: codePrompt,
          role: 'developer',
          timeout: 600000, // 10 minutes
        });

        return {
          success: result.success,
          output: result.output,
          duration: result.duration,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, output: '', duration: 0, error: errorMessage };
      }
    });

    // Step 7: Post implementation results
    await step.run('post-code-result', async () => {
      if (codeResult.success) {
        const summary = codeResult.output.length > 1500
          ? codeResult.output.substring(codeResult.output.length - 1500)
          : codeResult.output;

        return postAsRole('Developer', channel, 'Sprint implementation completed', [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Sprint ${sprintNumber} Implementation Complete*\n\n_Duration: ${Math.round(codeResult.duration / 1000)}s_\n\n\`\`\`${summary.substring(0, 2000)}\`\`\``,
            },
          },
        ], startMessage?.ts);
      } else {
        return postAsRole('Developer', channel, 'Implementation encountered issues', [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Implementation Issues*\n\n${codeResult.error || 'Unknown error'}\n\n_Manual intervention may be required._`,
            },
          },
        ], startMessage?.ts);
      }
    });

    console.log(`[Sprint] Sprint ${sprintNumber} of ${projectName} approved - Developer implementation ${codeResult.success ? 'completed' : 'had issues'}`);

    return {
      success: true,
      projectId,
      sprintNumber,
      implementerInvoked: true,
      codeImplemented: codeResult.success,
      messageTs: startMessage?.ts,
    };
  }
);

/**
 * Handle sprint rejection - notify team
 */
const handleSprintRejected = inngest.createFunction(
  {
    id: 'sprint-rejected-handler',
    name: 'Handle Sprint Rejected',
    ...WORKFLOW_RETRY_CONFIG,
  },
  { event: 'sprint/rejected' },
  async ({ event, step }) => {
    const { projectName, sprintNumber, sprintName, rejectionReason } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    await step.run('announce-rejection', async () => {
      return postAsRole('PM', channel, `Sprint ${sprintNumber} requires re-planning`, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '⚠️ Sprint Needs Re-planning', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${projectName}* - Sprint ${sprintNumber} (${sprintName}) was not approved.\n\n${rejectionReason ? `*Reason:* ${rejectionReason}` : '_No reason provided_'}\n\nSprint has been reset to PLANNED status for re-scoping.`,
          },
        },
      ]);
    });

    return { success: true, sprintNumber };
  }
);

/**
 * Handle project completion - final notification and archival
 */
const handleProjectCompleted = inngest.createFunction(
  {
    id: 'project-completed-handler',
    name: 'Handle Project Completion',
    ...WORKFLOW_RETRY_CONFIG,
  },
  { event: 'project/completed' },
  async ({ event, step }) => {
    const { projectId, projectName, clientName, totalSprints } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';

    // CTO announces project completion
    await step.run('announce-completion', async () => {
      return postAsRole('CTO', channel, `Project completed: ${projectName}`, [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🎉 Project Completed!', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${projectName}* for *${clientName}* has been successfully completed!\n\n*Sprints delivered:* ${totalSprints}`,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Ready for client delivery and knowledge consolidation_` },
          ],
        },
      ]);
    });

    // Generate completion summary from PM
    const summary = await step.run('generate-summary', async () => {
      return generateRoleResponse(
        'PM',
        `Project "${projectName}" has just been completed after ${totalSprints} sprint(s). Provide a brief project completion summary including key deliverables and lessons learned.`
      );
    });

    await step.run('post-summary', async () => {
      return postAsRole('PM', channel, summary.response, [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Project Summary*\n\n${summary.response}` },
        },
      ]);
    });

    return { success: true, projectId, projectName };
  }
);

/**
 * Handle sprint feedback - process owner feedback and allow AI to ask clarifying questions
 */
const handleSprintFeedback = inngest.createFunction(
  {
    id: 'sprint-feedback-handler',
    name: 'Handle Sprint Feedback',
    ...WORKFLOW_RETRY_CONFIG,
  },
  { event: 'sprint/feedback_received' },
  async ({ event, step }) => {
    const {
      projectId,
      projectName,
      sprintId,
      sprintNumber,
      sprintStatus,
      reviewId,
      feedbackType,
      content,
      conversationHistory,
    } = event.data;
    const channel = process.env.SLACK_DEFAULT_CHANNEL || 'ai-team-test';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Step 1: Post the feedback to Slack for visibility
    const feedbackMessage = await step.run('post-feedback', async () => {
      const isResponse = feedbackType === 'response';
      return postAsRole('PM', channel, `Owner ${isResponse ? 'responded' : 'provided feedback'}`, [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: isResponse ? '💬 Owner Response' : '📝 Sprint Feedback Received',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${projectName}* - Sprint ${sprintNumber}\n\n${content}`,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `_Feedback conversation: ${conversationHistory.length} message(s)_` },
          ],
        },
      ]);
    });

    // Step 2: Have PM analyze feedback and decide if clarification is needed
    const pmAnalysis = await step.run('pm-analyze-feedback', async () => {
      const historyContext = conversationHistory
        .map((entry: { type: string; from: string; content: string }) => `[${entry.from}]: ${entry.content}`)
        .join('\n');

      return generateRoleResponse(
        'PM',
        `Review this feedback conversation for Sprint ${sprintNumber} of "${projectName}":\n\n${historyContext}\n\nAs PM, analyze this feedback. If you have clarifying questions that would help the team proceed, ask ONE specific question. If the feedback is clear, acknowledge it and summarize the key takeaways for the team.\n\nRespond in this format:\n- If you have a question: "QUESTION: [your question]"\n- If feedback is clear: "ACKNOWLEDGED: [summary of key points]"`,
        channel,
        feedbackMessage?.ts
      );
    });

    // Step 3: Determine if PM has a question or is acknowledging
    const hasQuestion = pmAnalysis.response.toUpperCase().startsWith('QUESTION:');

    if (hasQuestion) {
      // Extract the question
      const question = pmAnalysis.response.replace(/^QUESTION:\s*/i, '').trim();

      // Store the question in the conversation log via API
      await step.run('store-ai-question', async () => {
        // We need to update the sprint review with the AI question
        const response = await fetch(`${baseUrl}/api/sprints/${sprintId}/feedback/ai-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewId,
            role: 'PM',
            question,
          }),
        });
        return response.json();
      });

      // Post question to Slack with response button
      await step.run('post-question', async () => {
        return postAsRole('PM', channel, question, [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❓ *Clarifying Question*\n\n${question}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '💬 Respond in Dashboard', emoji: true },
                url: `${baseUrl}/projects/${projectId}?sprint=${sprintId}&respond=true`,
                action_id: 'respond_to_question',
              },
            ],
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `_Awaiting owner response to continue_` },
            ],
          },
        ], feedbackMessage?.ts);
      });

      return {
        success: true,
        action: 'question_asked',
        question,
        projectId,
        sprintNumber,
      };
    } else {
      // Feedback acknowledged - extract key points
      const acknowledgment = pmAnalysis.response.replace(/^ACKNOWLEDGED:\s*/i, '').trim();

      // Store acknowledgment in conversation log
      await step.run('store-acknowledgment', async () => {
        const response = await fetch(`${baseUrl}/api/sprints/${sprintId}/feedback/ai-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewId,
            role: 'PM',
            acknowledgment,
          }),
        });
        return response.json();
      });

      // Post acknowledgment to Slack
      await step.run('post-acknowledgment', async () => {
        return postAsRole('PM', channel, acknowledgment, [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Feedback Acknowledged*\n\n${acknowledgment}`,
            },
          },
        ], feedbackMessage?.ts);
      });

      // If sprint is AWAITING_APPROVAL, remind about approval buttons
      if (sprintStatus === 'AWAITING_APPROVAL') {
        await step.run('remind-approval', async () => {
          return postAsRole('PM', channel, 'Ready for approval decision', [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📋 Sprint ${sprintNumber} is ready for your approval decision. Use the approval buttons above or visit the dashboard.`,
              },
            },
          ], feedbackMessage?.ts);
        });
      }

      return {
        success: true,
        action: 'acknowledged',
        summary: acknowledgment,
        projectId,
        sprintNumber,
      };
    }
  }
);

// All functions to serve
const functions = [
  testFunction,
  postHandoffToSlack,
  postTaskUpdateToSlack,
  requestApprovalViaSlack,
  roleToRoleMessage,
  postBugReportToSlack,
  // Executive functions
  postEscalationToSlack,
  postDirectiveToSlack,
  requestStatusReport,
  // Message handling
  handleSlackMessage,
  // Scheduled reports (cron)
  dailyFinancialPulse,
  dailyOpsSummary,
  dailySystemHealth,
  weeklyEngineeringSummary,
  weeklyMarketingSummary,
  weeklyOpsReport,
  weeklyFinancialSummary,
  dailyProjectSummary,
  // Project lifecycle
  handleProjectKickoff,
  handleSprintCompleted,
  handleSprintApproved,
  handleSprintRejected,
  handleProjectCompleted,
  handleSprintFeedback,
];

// Create and export the serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
