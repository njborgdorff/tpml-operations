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
  const existingFilesContext = existingFiles && existingFiles.length > 0
    ? `\n\n## Existing Files You Can Reference/Modify\n${existingFiles.map(f => `### ${f.path}\n\`\`\`\n${f.content.substring(0, 2000)}${f.content.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``).join('\n\n')}`
    : '';

  const feedbackContext = previousFeedback
    ? `\n\n## Previous Feedback to Address\n${previousFeedback}`
    : '';

  const systemPrompt = `You are the Implementer for TPML (Total Product Management, Ltd.), a senior developer who writes production-quality code.

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
- Database schema is in prisma/schema.prisma`;

  const userPrompt = `## Your Task
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
      max_tokens: 8000,
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
