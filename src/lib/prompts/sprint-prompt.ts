/**
 * Sprint Prompt Generator
 *
 * Generates copy-paste-ready prompts for Claude Code based on
 * PM backlog, CTO architecture, and sprint-specific context.
 *
 * This replaces automated implementation with human-controlled
 * Claude Code sessions for better oversight and local testing.
 */

export interface SprintPromptContext {
  // Project info
  projectName: string;
  projectSlug: string;
  clientName: string;
  projectType: 'NEW_PROJECT' | 'NEW_FEATURE' | 'BUG_FIX';
  targetCodebase?: string;

  // Sprint info
  sprintNumber: number;
  sprintName?: string;
  sprintGoal?: string;

  // Artifacts
  backlogContent?: string;
  architectureContent?: string;
  handoffContent?: string;

  // For bug fixes
  bugDescription?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;

  // For features
  featureDescription?: string;
  acceptanceCriteria?: string;

  // Reference documents summary (not full content - just names)
  referenceDocuments?: { name: string; type: string }[];
}

/**
 * Generate a comprehensive prompt for Claude Code implementation
 */
export function generateSprintPrompt(context: SprintPromptContext): string {
  const {
    projectName,
    projectSlug,
    clientName,
    projectType,
    targetCodebase,
    sprintNumber,
    sprintName,
    sprintGoal,
    backlogContent,
    architectureContent,
    bugDescription,
    stepsToReproduce,
    expectedBehavior,
    featureDescription,
    acceptanceCriteria,
    referenceDocuments,
  } = context;

  const workingDir = targetCodebase || projectSlug;
  const date = new Date().toISOString().split('T')[0];

  // Build the prompt based on project type
  if (projectType === 'BUG_FIX') {
    return generateBugFixPrompt({
      projectName,
      workingDir,
      bugDescription: bugDescription || 'No description provided',
      stepsToReproduce,
      expectedBehavior,
      referenceDocuments,
    });
  }

  if (projectType === 'NEW_FEATURE') {
    return generateFeaturePrompt({
      projectName,
      workingDir,
      featureDescription: featureDescription || 'No description provided',
      acceptanceCriteria,
      architectureContent,
      referenceDocuments,
    });
  }

  // NEW_PROJECT - full prompt with backlog and architecture
  return generateNewProjectPrompt({
    projectName,
    clientName,
    workingDir,
    date,
    sprintNumber,
    sprintName,
    sprintGoal,
    backlogContent,
    architectureContent,
    referenceDocuments,
  });
}

interface BugFixPromptParams {
  projectName: string;
  workingDir: string;
  bugDescription: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  referenceDocuments?: { name: string; type: string }[];
}

function generateBugFixPrompt(params: BugFixPromptParams): string {
  const { projectName, workingDir, bugDescription, stepsToReproduce, expectedBehavior, referenceDocuments } = params;

  let prompt = `# Bug Fix: ${projectName}

You are fixing a bug in an existing codebase. Work carefully and make minimal, targeted changes.

## Working Directory
\`C:/tpml-ai-team/projects/${workingDir}\`

## Bug Description
${bugDescription}
`;

  if (stepsToReproduce) {
    prompt += `
## Steps to Reproduce
${stepsToReproduce}
`;
  }

  if (expectedBehavior) {
    prompt += `
## Expected Behavior
${expectedBehavior}
`;
  }

  if (referenceDocuments && referenceDocuments.length > 0) {
    prompt += `
## Reference Documents
The following reference documents were uploaded. Check the project dashboard if you need to view them:
${referenceDocuments.map(d => `- ${d.name} (${d.type})`).join('\n')}
`;
  }

  prompt += `
## Your Task

1. **Investigate** - Search the codebase to understand the bug location and root cause
2. **Plan** - Explain your fix approach before making changes
3. **Implement** - Make minimal, targeted changes to fix the bug
4. **Test** - Run existing tests to verify no regressions
5. **Document** - Add a comment if the fix isn't obvious

## Guidelines

- Keep changes minimal and focused on the bug
- Don't refactor unrelated code
- Don't add features or improvements beyond the fix
- Preserve existing code style and patterns
- Run \`npm test\` or equivalent before finishing

## When Done

Let me know what you changed and why. I'll review the changes locally, run tests, and commit when satisfied.
`;

  return prompt;
}

interface FeaturePromptParams {
  projectName: string;
  workingDir: string;
  featureDescription: string;
  acceptanceCriteria?: string;
  architectureContent?: string;
  referenceDocuments?: { name: string; type: string }[];
}

function generateFeaturePrompt(params: FeaturePromptParams): string {
  const { projectName, workingDir, featureDescription, acceptanceCriteria, architectureContent, referenceDocuments } = params;

  let prompt = `# Feature Implementation: ${projectName}

You are adding a new feature to an existing codebase. Follow existing patterns and conventions.

## Working Directory
\`C:/tpml-ai-team/projects/${workingDir}\`

## Feature Description
${featureDescription}
`;

  if (acceptanceCriteria) {
    prompt += `
## Acceptance Criteria
${acceptanceCriteria}
`;
  }

  if (referenceDocuments && referenceDocuments.length > 0) {
    prompt += `
## Reference Documents
The following reference documents were uploaded. Check the project dashboard if you need to view them:
${referenceDocuments.map(d => `- ${d.name} (${d.type})`).join('\n')}
`;
  }

  prompt += `
## Your Task

1. **Explore** - Review the existing codebase to understand patterns and conventions
2. **Plan** - Outline your implementation approach before coding
3. **Implement** - Build the feature following existing patterns
4. **Test** - Write tests for the new functionality
5. **Verify** - Run the test suite to ensure nothing is broken

## Guidelines

- Follow existing code patterns and conventions
- Maintain consistency with the current architecture
- Write clear, readable code with appropriate comments
- Add tests for new functionality
- Keep commits logical and atomic

`;

  if (architectureContent) {
    prompt += `
---

## Architecture Reference

${architectureContent.substring(0, 3000)}${architectureContent.length > 3000 ? '\n\n... (truncated, see full ARCHITECTURE.md in docs/)' : ''}
`;
  }

  prompt += `
---

## When Done

Let me know what you implemented. I'll review the changes locally, run tests, and commit when satisfied.
`;

  return prompt;
}

interface NewProjectPromptParams {
  projectName: string;
  clientName: string;
  workingDir: string;
  date: string;
  sprintNumber: number;
  sprintName?: string;
  sprintGoal?: string;
  backlogContent?: string;
  architectureContent?: string;
  referenceDocuments?: { name: string; type: string }[];
}

function generateNewProjectPrompt(params: NewProjectPromptParams): string {
  const {
    projectName,
    clientName,
    workingDir,
    date,
    sprintNumber,
    sprintName,
    sprintGoal,
    backlogContent,
    architectureContent,
    referenceDocuments,
  } = params;

  // Extract sprint-specific items from backlog
  const sprintItems = backlogContent ? extractSprintItems(backlogContent, sprintNumber) : null;

  let prompt = `# Sprint ${sprintNumber} Implementation: ${projectName}

**Client:** ${clientName}
**Date:** ${date}
**Sprint:** ${sprintNumber}${sprintName ? ` - ${sprintName}` : ''}

## Working Directory
\`C:/tpml-ai-team/projects/${workingDir}\`

`;

  if (sprintGoal) {
    prompt += `## Sprint Goal
${sprintGoal}

`;
  }

  if (sprintItems) {
    prompt += `## Sprint ${sprintNumber} Deliverables

${sprintItems}

`;
  }

  if (referenceDocuments && referenceDocuments.length > 0) {
    prompt += `## Reference Documents
The following reference documents were uploaded. Check the project dashboard if you need to view them:
${referenceDocuments.map(d => `- ${d.name} (${d.type})`).join('\n')}

`;
  }

  prompt += `## Your Task

1. **Review** - Read through the backlog and architecture below
2. **Plan** - Start with highest priority items (P0 first, then P1, then P2)
3. **Implement** - Build features according to the architecture
4. **Test** - Write tests as you go, run the test suite
5. **Iterate** - Complete all Sprint ${sprintNumber} items

## Implementation Guidelines

- Implement features in priority order (P0 -> P1 -> P2)
- Follow the architecture decisions below
- Write tests alongside implementation
- Keep code clean and well-documented
- Check in with me if you're unsure about anything

`;

  if (architectureContent) {
    prompt += `
---

# ARCHITECTURE

${architectureContent}

`;
  }

  if (backlogContent) {
    prompt += `
---

# BACKLOG

${backlogContent}

`;
  }

  prompt += `
---

## When Done

Let me know when Sprint ${sprintNumber} is complete. I'll review locally, run tests, and commit the changes.
`;

  return prompt;
}

/**
 * Extract sprint-specific items from backlog markdown
 */
function extractSprintItems(backlog: string, sprintNumber: number): string | null {
  const sprintRegex = new RegExp(
    `### Sprint ${sprintNumber}[^#]*([\\s\\S]*?)(?=### Sprint ${sprintNumber + 1}|---|\n## |$)`,
    'i'
  );
  const match = backlog.match(sprintRegex);

  if (match && match[1]) {
    const content = match[1].trim();
    // Extract table rows or list items
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 &&
             !trimmed.startsWith('---') &&
             !trimmed.match(/^\|?\s*ID\s*\|/i);
    });

    if (lines.length > 0) {
      return lines.join('\n');
    }
  }

  return null;
}

/**
 * Generate a shorter "quick start" version of the prompt
 * for cases where user just wants the essentials
 */
export function generateQuickPrompt(context: SprintPromptContext): string {
  const { projectName, projectSlug, targetCodebase, sprintNumber, sprintGoal, projectType } = context;
  const workingDir = targetCodebase || projectSlug;

  if (projectType === 'BUG_FIX') {
    return `Fix the bug in C:/tpml-ai-team/projects/${workingDir}

Bug: ${context.bugDescription || 'See dashboard for details'}

Keep changes minimal. Run tests when done.`;
  }

  if (projectType === 'NEW_FEATURE') {
    return `Add feature to C:/tpml-ai-team/projects/${workingDir}

Feature: ${context.featureDescription || 'See dashboard for details'}

Follow existing patterns. Run tests when done.`;
  }

  return `Implement Sprint ${sprintNumber} for ${projectName}

Working directory: C:/tpml-ai-team/projects/${workingDir}

${sprintGoal ? `Goal: ${sprintGoal}` : 'See BACKLOG.md for sprint items.'}

Review ARCHITECTURE.md for tech decisions. Implement in priority order (P0 -> P1 -> P2).`;
}
