/**
 * File operation tools for Claude to use during implementation.
 * These tools are called by Claude via tool_use, and we execute them
 * either locally (if running on a machine with filesystem access)
 * or via GitHub API (for serverless environments).
 */

import Anthropic from '@anthropic-ai/sdk';

export interface FileOperation {
  type: 'create' | 'edit' | 'delete';
  path: string;
  content?: string;
  description?: string;
}

export interface ImplementationResult {
  success: boolean;
  operations: FileOperation[];
  summary: string;
  error?: string;
}

// Tool definitions for Claude
export const implementationTools: Anthropic.Tool[] = [
  {
    name: 'create_file',
    description: 'Create a new file with the specified content. Use this for new files that don\'t exist yet.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The file path relative to the project root (e.g., "src/components/MyComponent.tsx")',
        },
        content: {
          type: 'string',
          description: 'The complete content of the file',
        },
        description: {
          type: 'string',
          description: 'Brief description of what this file does',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Edit an existing file by replacing its entire content. Use this when you need to modify an existing file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The file path relative to the project root',
        },
        content: {
          type: 'string',
          description: 'The new complete content of the file',
        },
        description: {
          type: 'string',
          description: 'Brief description of what changes were made',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'implementation_complete',
    description: 'Call this when you have finished implementing all required features. Provide a summary of what was done.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: 'A summary of all changes made, including files created/modified and features implemented',
        },
        testing_notes: {
          type: 'string',
          description: 'Notes about how to test the implementation',
        },
      },
      required: ['summary'],
    },
  },
];

/**
 * Run implementation with Claude using tool_use to generate actual file operations
 */
export async function runImplementation(
  projectName: string,
  sprintNumber: number,
  sprintName: string,
  handoffContent: string,
  existingFiles?: { path: string; content: string }[],
  previousFeedback?: string
): Promise<ImplementationResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const operations: FileOperation[] = [];
  let summary = '';
  let testingNotes = '';

  // Build context about existing files
  const hasExistingCode = existingFiles && existingFiles.length > 0;
  const hasFeedback = !!previousFeedback;

  const existingFilesContext = hasExistingCode
    ? `\n\n## YOUR EXISTING CODE (from previous implementation)\n\nThese files are YOUR previous implementation. You MUST modify these files to address any feedback.\n\n${existingFiles!.map(f => `### ${f.path}\n\`\`\`\n${f.content.substring(0, 4000)}${f.content.length > 4000 ? '\n... (truncated)' : ''}\n\`\`\``).join('\n\n')}`
    : '';

  const feedbackContext = hasFeedback
    ? `\n\n## FEEDBACK TO ADDRESS\n${previousFeedback}`
    : '';

  // Different system prompt based on whether this is a fix iteration or initial implementation
  const systemPrompt = hasExistingCode && hasFeedback
    ? `You are the Implementer for TPML. You previously implemented code that received feedback.

## CRITICAL INSTRUCTION
You are NOT starting fresh. You have EXISTING CODE that needs FIXES based on feedback.
- DO NOT recreate files from scratch
- ONLY use edit_file to modify existing files
- ONLY use create_file for genuinely NEW files that don't exist yet
- Focus ONLY on addressing the specific feedback issues

## Rules
1. Read the existing code carefully - this is YOUR previous work
2. Identify what specific changes are needed based on feedback
3. Use edit_file to fix existing files
4. Only use create_file for new files (like migration files, test files, etc.)
5. Call implementation_complete when you've addressed ALL feedback issues

## Project Context
- Next.js 14 with TypeScript, Tailwind CSS, Prisma
- Components use shadcn/ui conventions
- API routes: src/app/api/
- Components: src/components/
- Database: prisma/schema.prisma`
    : `You are the Implementer for TPML (Total Product Management, Ltd.), a senior developer who writes production-quality code.

Your job is to ACTUALLY IMPLEMENT the features described in the handoff document by creating and editing files.

## Rules
1. You MUST use the create_file or edit_file tools to write actual code - do NOT just describe what you would do
2. Write complete, working code - not pseudocode or snippets
3. Follow TypeScript/React best practices
4. Include proper imports and type definitions
5. When you're done implementing everything, call implementation_complete with a summary

## Project Context
- This is a Next.js 14 project with TypeScript, Tailwind CSS, and Prisma
- Components use shadcn/ui conventions
- API routes are in src/app/api/
- Components are in src/components/
- Database schema is in prisma/schema.prisma

## CRITICAL: Complete Code Only
- Every file you create MUST be complete with ALL closing brackets, braces, and tags
- Never truncate code - if a file is too long, split into multiple smaller files
- Always verify your code has matching opening and closing: { }, ( ), < >, [ ]
- Include all necessary imports at the top of each file
- End React components with proper export statements`;

  const userPrompt = hasExistingCode && hasFeedback
    ? `## FIX TASK - Address Feedback for Sprint ${sprintNumber} (${sprintName})

Your existing implementation received feedback. You must FIX the existing code, NOT start over.
${existingFilesContext}
${feedbackContext}

## Instructions
1. Read your existing code above
2. Read the feedback carefully
3. Use edit_file to fix ONLY what needs to be fixed
4. Add any NEW files needed (like tests, migrations) with create_file
5. Call implementation_complete with a summary of what you fixed

IMPORTANT: Each file must be COMPLETE - include ALL closing brackets and tags. Never truncate.

DO NOT recreate all files. Only modify what needs to change.`
    : `## Your Task
Implement Sprint ${sprintNumber} (${sprintName}) for project "${projectName}".

## Handoff Document
${handoffContent}
${existingFilesContext}
${feedbackContext}

## Instructions
1. Read and understand the requirements
2. Use create_file and edit_file tools to write the actual code
3. Create all necessary files for the feature to work
4. When done, call implementation_complete with a summary

IMPORTANT: Each file must be COMPLETE - include ALL closing brackets, braces, and JSX tags.
- If a file would be very long, split it into smaller focused files
- Never leave code incomplete or truncated
- Always include proper imports and exports

Start implementing now. Use the tools to create real files.`;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userPrompt },
  ];

  // Allow up to 20 tool calls (file operations)
  const MAX_ITERATIONS = 20;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000, // Increased to prevent truncation
      system: systemPrompt,
      tools: implementationTools,
      messages,
    });

    // Check if Claude wants to use tools
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const input = toolUse.input as Record<string, string>;

        if (toolUse.name === 'create_file') {
          operations.push({
            type: 'create',
            path: input.path,
            content: input.content,
            description: input.description,
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `File created: ${input.path}`,
          });
        } else if (toolUse.name === 'edit_file') {
          operations.push({
            type: 'edit',
            path: input.path,
            content: input.content,
            description: input.description,
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `File edited: ${input.path}`,
          });
        } else if (toolUse.name === 'implementation_complete') {
          summary = input.summary;
          testingNotes = input.testing_notes || '';
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: 'Implementation marked as complete.',
          });

          // Return immediately when implementation_complete is called
          return {
            success: true,
            operations,
            summary: `${summary}\n\n**Testing Notes:**\n${testingNotes}`,
          };
        }
      }

      // Add assistant message with tool uses and our tool results
      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push({
        role: 'user',
        content: toolResults,
      });
    } else {
      // Claude stopped without tool_use - might have finished or hit an issue
      const textContent = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (operations.length > 0) {
        // We have operations, consider it a success
        return {
          success: true,
          operations,
          summary: textContent?.text || 'Implementation completed.',
        };
      } else {
        // No operations generated
        return {
          success: false,
          operations: [],
          summary: '',
          error: textContent?.text || 'No file operations were generated.',
        };
      }
    }
  }

  // Hit max iterations
  return {
    success: operations.length > 0,
    operations,
    summary: 'Implementation reached maximum iterations.',
    error: operations.length === 0 ? 'Max iterations reached without generating code.' : undefined,
  };
}

/**
 * Validation result for code analysis
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixes?: FileOperation[];
}

/**
 * Check if code appears to be truncated by looking for unbalanced brackets and common truncation patterns.
 */
function detectTruncation(content: string, filePath: string): string | null {
  if (!content) return null;

  // Count brackets
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;

  // Check for significant imbalance (allow small variance for regex/strings)
  if (openBraces - closeBraces > 2) {
    return `${filePath} has ${openBraces - closeBraces} unclosed curly braces - file appears truncated`;
  }
  if (openParens - closeParens > 3) {
    return `${filePath} has ${openParens - closeParens} unclosed parentheses - file appears truncated`;
  }

  // Check for JSX/TSX files with unclosed tags
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    const openTags = (content.match(/<[A-Z][a-zA-Z]*(?:\s|>)/g) || []).length;
    const closeTags = (content.match(/<\/[A-Z][a-zA-Z]*>/g) || []).length;
    const selfClosingTags = (content.match(/<[A-Z][a-zA-Z]*[^>]*\/>/g) || []).length;

    if (openTags - closeTags - selfClosingTags > 2) {
      return `${filePath} has unclosed JSX tags - file appears truncated`;
    }
  }

  // Check for common truncation patterns
  const lines = content.split('\n');
  const lastLine = lines[lines.length - 1]?.trim() || '';
  const secondLastLine = lines[lines.length - 2]?.trim() || '';

  // File ends mid-statement
  const truncationPatterns = [
    /^(const|let|var|function|async|import|export|return|if|else|for|while|try|catch)\s*$/,
    /[,{(\[:=]\s*$/,  // Ends with operator expecting more
    /^\s*\.\.\.\s*$/,  // Ends with spread operator alone
  ];

  for (const pattern of truncationPatterns) {
    if (pattern.test(lastLine) || pattern.test(secondLastLine)) {
      return `${filePath} ends mid-statement - file appears truncated`;
    }
  }

  // File doesn't have proper ending for its type
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    if (!content.includes('export') && content.length > 100) {
      return `${filePath} has no export statement - may be truncated or incomplete`;
    }
  }

  return null;
}

/**
 * Validate generated code for common build errors before committing.
 * First checks for truncation, then uses Claude to analyze for other errors.
 */
export async function validateGeneratedCode(
  operations: FileOperation[],
  existingFilesList?: string[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // First pass: Quick truncation detection (no API call needed)
  for (const op of operations) {
    if (op.content) {
      const truncationError = detectTruncation(op.content, op.path);
      if (truncationError) {
        errors.push(truncationError);
      }
    }
  }

  // If we found truncation errors, return immediately without API call
  if (errors.length > 0) {
    console.log(`[Validation] Found ${errors.length} truncation errors, skipping AI validation`);
    return { valid: false, errors, warnings };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build a summary of the files being created/modified
  const filesSummary = operations.map(op => {
    const preview = op.content?.substring(0, 2000) || '';
    return `### ${op.type.toUpperCase()}: ${op.path}\n\`\`\`\n${preview}${(op.content?.length || 0) > 2000 ? '\n... (truncated for review)' : ''}\n\`\`\``;
  }).join('\n\n');

  const existingFilesContext = existingFilesList?.length
    ? `\n\nExisting files in the project:\n${existingFilesList.slice(0, 50).map(f => `- ${f}`).join('\n')}`
    : '';

  const prompt = `You are a build validator. Analyze the following file operations for a Next.js 14 project with TypeScript.

## Files to validate:

${filesSummary}
${existingFilesContext}

## Check for these common errors:

1. **Next.js Routing Conflicts**: Multiple dynamic routes at the same level (e.g., [id] and [slug] in the same directory)
2. **Missing Imports**: Components or functions used but not imported
3. **TypeScript Errors**: Type mismatches, missing type annotations for exports
4. **Syntax Errors**: Malformed JSX, unclosed brackets, invalid JavaScript
5. **Missing Dependencies**: Using packages that aren't typically in a Next.js project
6. **Invalid File Paths**: Files in wrong directories for Next.js conventions

## Response Format:

Respond with a JSON object (no markdown, just raw JSON):
{
  "valid": true/false,
  "errors": ["critical error 1", "critical error 2"],
  "warnings": ["warning 1", "warning 2"]
}

- "errors" = issues that WILL cause build failure
- "warnings" = potential issues or best practice violations
- Set "valid" to false if there are any errors`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    if (!textContent) {
      return { valid: true, errors: [], warnings: ['Could not parse validation response'] };
    }

    // Try to parse JSON response
    const text = textContent.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        valid: result.valid ?? true,
        errors: result.errors || [],
        warnings: result.warnings || [],
      };
    }

    return { valid: true, errors: [], warnings: ['Could not parse validation response'] };
  } catch (error) {
    console.error('[Validation] Error during code validation:', error);
    // Don't block on validation errors - return valid with a warning
    return {
      valid: true,
      errors: [],
      warnings: [`Validation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Deployment status result from GitHub
 */
export interface DeploymentStatus {
  hasDeployments: boolean;
  latestStatus?: 'pending' | 'success' | 'failure' | 'error' | 'in_progress' | 'queued';
  deploymentUrl?: string;
  environment?: string;
  description?: string;
}

/**
 * Check GitHub deployment status for a commit.
 * This queries the GitHub Deployments API to see if Vercel (or other CI) has created deployments.
 */
export async function getDeploymentStatus(
  repo: string,
  commitSha: string
): Promise<DeploymentStatus> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return { hasDeployments: false };
  }

  try {
    // Get deployments for this repo
    const deploymentsResponse = await fetch(
      `https://api.github.com/repos/${repo}/deployments?sha=${commitSha}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!deploymentsResponse.ok) {
      console.log(`[Deployment] Failed to fetch deployments: ${deploymentsResponse.status}`);
      return { hasDeployments: false };
    }

    const deployments = await deploymentsResponse.json();

    if (!deployments || deployments.length === 0) {
      return { hasDeployments: false };
    }

    // Get the latest deployment
    const latestDeployment = deployments[0];

    // Get statuses for this deployment
    const statusesResponse = await fetch(
      `https://api.github.com/repos/${repo}/deployments/${latestDeployment.id}/statuses`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!statusesResponse.ok) {
      return {
        hasDeployments: true,
        environment: latestDeployment.environment,
        latestStatus: 'pending',
      };
    }

    const statuses = await statusesResponse.json();
    const latestStatusObj = statuses[0];

    return {
      hasDeployments: true,
      latestStatus: latestStatusObj?.state || 'pending',
      deploymentUrl: latestStatusObj?.target_url || latestStatusObj?.environment_url,
      environment: latestDeployment.environment,
      description: latestStatusObj?.description,
    };
  } catch (error) {
    console.error('[Deployment] Error checking deployment status:', error);
    return { hasDeployments: false };
  }
}

/**
 * Wait for deployment and return final status.
 * Polls GitHub every 10 seconds for up to maxWaitMs.
 */
export async function waitForDeployment(
  repo: string,
  commitSha: string,
  maxWaitMs: number = 120000 // 2 minutes default
): Promise<DeploymentStatus> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getDeploymentStatus(repo, commitSha);

    // If we have a final status, return it
    if (status.hasDeployments &&
        status.latestStatus &&
        !['pending', 'in_progress', 'queued'].includes(status.latestStatus)) {
      return status;
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Return whatever status we have after timeout
  return getDeploymentStatus(repo, commitSha);
}

/**
 * Apply file operations via GitHub API
 */
export async function applyOperationsViaGitHub(
  operations: FileOperation[],
  repo: string, // e.g., "owner/repo"
  branch: string,
  commitMessage: string
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return { success: false, error: 'GITHUB_TOKEN not configured' };
  }

  try {
    // Get the current commit SHA for the branch
    const branchResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/ref/heads/${branch}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    let baseCommitSha: string;

    if (!branchResponse.ok) {
      // Branch doesn't exist - try to create it from main or master
      const defaultBranches = ['main', 'master'];
      let defaultBranchSha: string | null = null;

      for (const defaultBranch of defaultBranches) {
        const defaultBranchResponse = await fetch(
          `https://api.github.com/repos/${repo}/git/ref/heads/${defaultBranch}`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (defaultBranchResponse.ok) {
          const defaultBranchData = await defaultBranchResponse.json();
          defaultBranchSha = defaultBranchData.object.sha;
          break;
        }
      }

      if (!defaultBranchSha) {
        return { success: false, error: 'Could not find main or master branch to branch from' };
      }

      // Create the new branch
      const createBranchResponse = await fetch(
        `https://api.github.com/repos/${repo}/git/refs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: defaultBranchSha,
          }),
        }
      );

      if (!createBranchResponse.ok) {
        const error = await createBranchResponse.text();
        return { success: false, error: `Failed to create branch '${branch}': ${error}` };
      }

      baseCommitSha = defaultBranchSha;
    } else {
      const branchData = await branchResponse.json();
      baseCommitSha = branchData.object.sha;
    }

    // Get the base tree
    const commitResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/commits/${baseCommitSha}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!commitResponse.ok) {
      return { success: false, error: 'Failed to get base commit' };
    }

    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for each file
    const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];

    for (const op of operations) {
      if (op.type === 'delete') {
        // For delete, we don't add to tree (it will be missing from new tree)
        continue;
      }

      // Create blob for the file content
      const blobResponse = await fetch(
        `https://api.github.com/repos/${repo}/git/blobs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: op.content,
            encoding: 'utf-8',
          }),
        }
      );

      if (!blobResponse.ok) {
        const error = await blobResponse.text();
        return { success: false, error: `Failed to create blob for ${op.path}: ${error}` };
      }

      const blobData = await blobResponse.json();
      treeItems.push({
        path: op.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // Create new tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/trees`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      }
    );

    if (!treeResponse.ok) {
      const error = await treeResponse.text();
      return { success: false, error: `Failed to create tree: ${error}` };
    }

    const treeData = await treeResponse.json();

    // Create commit
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/commits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          tree: treeData.sha,
          parents: [baseCommitSha],
        }),
      }
    );

    if (!newCommitResponse.ok) {
      const error = await newCommitResponse.text();
      return { success: false, error: `Failed to create commit: ${error}` };
    }

    const newCommitData = await newCommitResponse.json();

    // Update branch reference
    const updateRefResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sha: newCommitData.sha,
        }),
      }
    );

    if (!updateRefResponse.ok) {
      const error = await updateRefResponse.text();
      return { success: false, error: `Failed to update branch: ${error}` };
    }

    return { success: true, commitSha: newCommitData.sha };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
