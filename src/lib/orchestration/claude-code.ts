/**
 * Claude Code CLI Orchestration
 *
 * Invokes Claude Code CLI programmatically for autonomous AI team operations.
 * This enables the dashboard to trigger role-specific Claude sessions.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface ClaudeCodeOptions {
  projectPath: string;
  prompt: string;
  role: 'pm' | 'architect' | 'implementer' | 'developer' | 'reviewer' | 'qa';
  allowedTools?: string[];
  timeout?: number; // ms
  onOutput?: (chunk: string) => void;
  onError?: (error: string) => void;
}

export interface ClaudeCodeResult {
  success: boolean;
  output: string;
  exitCode: number | null;
  error?: string;
  duration: number;
}

/**
 * Build the role prompt with handoff context
 */
export async function buildRolePrompt(
  projectPath: string,
  role: string,
  additionalContext?: string
): Promise<string> {
  const roleUpper = role.toUpperCase();
  const tpmlRoot = 'C:/tpml-ai-team';

  // Read role prompt template
  const promptPath = path.join(tpmlRoot, 'tpml-core/workflows/prompts', `${role}.md`);
  let rolePrompt = '';

  try {
    rolePrompt = await fs.readFile(promptPath, 'utf-8');
  } catch {
    rolePrompt = `You are the ${roleUpper} for this project. Execute your responsibilities.`;
  }

  // Find handoff document to this role
  const docsPath = path.join(projectPath, 'docs');
  let handoffContent = '';

  try {
    const files = await fs.readdir(docsPath);
    const handoffFile = files
      .filter(f => f.startsWith('HANDOFF_') && f.includes(`_TO_${roleUpper}.md`))
      .sort()
      .pop(); // Get most recent

    if (handoffFile) {
      handoffContent = await fs.readFile(path.join(docsPath, handoffFile), 'utf-8');
    }
  } catch {
    // No docs folder or handoff
  }

  // Build complete prompt
  let prompt = `# Role Assignment: ${roleUpper}\n`;
  prompt += `# Project Path: ${projectPath}\n`;
  prompt += `# Date: ${new Date().toISOString()}\n\n`;
  prompt += `---\n\n`;
  prompt += rolePrompt;

  if (handoffContent) {
    prompt += `\n\n---\n\n## HANDOFF FROM PREVIOUS ROLE\n\n${handoffContent}`;
  }

  if (additionalContext) {
    prompt += `\n\n---\n\n## ADDITIONAL CONTEXT\n\n${additionalContext}`;
  }

  prompt += `\n\n---\n\nBegin your work. Focus on completing your responsibilities and creating the appropriate handoff document when done.`;

  return prompt;
}

/**
 * Invoke Claude Code CLI with a specific role prompt
 */
export function invokeClaudeCode(options: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
  const { projectPath, prompt, timeout = 300000, onOutput, onError } = options;
  const startTime = Date.now();

  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';
    let timedOut = false;

    // Build the command - using claude CLI with --print flag for non-interactive mode
    // The --print flag outputs the response without interactive terminal
    // Use stdin (-p -) to pass the prompt, avoiding command-line length limits
    const args = [
      '--print',
      '--output-format', 'text',
      '-p', '-', // Read prompt from stdin
    ];

    // Spawn claude process
    const proc: ChildProcess = spawn('claude', args, {
      cwd: projectPath,
      shell: true,
      env: {
        ...process.env,
        // Ensure Claude uses the project directory
        PWD: projectPath,
      },
    });

    // Write prompt to stdin and close it
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    // Set timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeout);

    proc.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      onOutput?.(chunk);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      errorOutput += chunk;
      onError?.(chunk);
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (timedOut) {
        resolve({
          success: false,
          output,
          exitCode: code,
          error: `Process timed out after ${timeout}ms`,
          duration,
        });
      } else {
        resolve({
          success: code === 0,
          output,
          exitCode: code,
          error: code !== 0 ? errorOutput || `Process exited with code ${code}` : undefined,
          duration,
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        output,
        exitCode: null,
        error: `Failed to spawn process: ${err.message}`,
        duration: Date.now() - startTime,
      });
    });
  });
}

/**
 * Create the implementation kickoff handoff document
 */
export async function createImplementationHandoff(
  projectPath: string,
  projectName: string,
  backlogContent: string,
  architectureContent: string,
  ownerDecisions?: string
): Promise<string> {
  const handoffContent = `# Handoff: CTO → Implementer

**Date:** ${new Date().toISOString().split('T')[0]}
**Project:** ${projectName}

## Summary

Project approved by owner. Ready to begin Sprint 1 implementation.

${ownerDecisions ? `## Owner Decisions\n\n${ownerDecisions}\n\n` : ''}

## Backlog Reference

The full product backlog is available in BACKLOG.md. Focus on Sprint 1 items first.

Key Sprint 1 deliverables from the backlog:
${extractSprint1Items(backlogContent)}

## Architecture Reference

The full architecture is available in ARCHITECTURE.md.

### Tech Stack Summary
${extractTechStack(architectureContent)}

## Action Items for Implementer

- [ ] Review BACKLOG.md for Sprint 1 requirements
- [ ] Review ARCHITECTURE.md for technical decisions
- [ ] Set up development environment if needed
- [ ] Implement Sprint 1 features in priority order
- [ ] Write tests for new functionality
- [ ] Update PROJECT_STATUS.md as you progress
- [ ] Create handoff to Reviewer when ready

## Implementation Notes

1. Follow existing code patterns and conventions
2. Implement features in priority order (P0 → P1 → P2)
3. Write unit tests alongside implementation
4. Keep commits atomic and well-described
5. Update docs as needed

## Next Steps

Begin with the highest priority Sprint 1 item. Focus on completing the MVP feature set.
`;

  // Write the handoff file
  const docsPath = path.join(projectPath, 'docs');
  await fs.mkdir(docsPath, { recursive: true });
  await fs.writeFile(
    path.join(docsPath, 'HANDOFF_CTO_TO_IMPLEMENTER.md'),
    handoffContent
  );

  return handoffContent;
}

function extractSprint1Items(backlog: string): string {
  // Extract Sprint 1 section from backlog markdown
  const sprint1Match = backlog.match(/### Sprint 1[^#]*([\s\S]*?)(?=### Sprint 2|---|\n## |$)/i);
  if (sprint1Match) {
    const items = sprint1Match[1]
      .split('\n')
      .filter(line => line.includes('|') && !line.includes('---') && !line.includes('ID'))
      .slice(0, 5) // First 5 items
      .map(line => `- ${line.split('|')[2]?.trim() || line}`)
      .join('\n');
    return items || '- See BACKLOG.md for details';
  }
  return '- See BACKLOG.md for details';
}

function extractTechStack(architecture: string): string {
  // Extract tech stack section
  const stackMatch = architecture.match(/## Tech Stack[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|([\s\S]*?)(?=\n## |$)/i);
  if (stackMatch) {
    return stackMatch[0].substring(0, 500); // First 500 chars of tech stack
  }
  return '- See ARCHITECTURE.md for details';
}

/**
 * Full autonomous implementation workflow
 */
export interface AutoImplementOptions {
  projectId: string;
  projectPath: string;
  projectName: string;
  backlogContent: string;
  architectureContent: string;
  ownerDecisions?: string;
  onStatusUpdate?: (status: string, details?: Record<string, unknown>) => void;
}

export async function runAutonomousImplementation(
  options: AutoImplementOptions
): Promise<{ success: boolean; message: string; outputs: string[] }> {
  const {
    projectPath,
    projectName,
    backlogContent,
    architectureContent,
    ownerDecisions,
    onStatusUpdate,
  } = options;

  const outputs: string[] = [];

  try {
    // Step 1: Create implementation handoff
    onStatusUpdate?.('creating_handoff', { role: 'CTO → Implementer' });
    await createImplementationHandoff(
      projectPath,
      projectName,
      backlogContent,
      architectureContent,
      ownerDecisions
    );
    outputs.push('Created HANDOFF_CTO_TO_IMPLEMENTER.md');

    // Step 2: Build implementer prompt
    onStatusUpdate?.('preparing_prompt', { role: 'Implementer' });
    const prompt = await buildRolePrompt(projectPath, 'implementer', `
Project: ${projectName}
Sprint: 1
Goal: Implement Sprint 1 MVP features

Important: Focus on creating working, tested code. Create a handoff to Reviewer when implementation is complete.
`);

    // Step 3: Invoke Claude Code
    onStatusUpdate?.('invoking_claude', { role: 'Implementer' });
    const result = await invokeClaudeCode({
      projectPath,
      prompt,
      role: 'implementer',
      timeout: 600000, // 10 minutes
      onOutput: (chunk) => {
        onStatusUpdate?.('claude_output', { chunk: chunk.substring(0, 100) });
      },
    });

    outputs.push(`Claude Code exited with code ${result.exitCode}`);
    outputs.push(`Duration: ${Math.round(result.duration / 1000)}s`);

    if (result.success) {
      onStatusUpdate?.('completed', { success: true });
      return {
        success: true,
        message: 'Autonomous implementation workflow completed successfully',
        outputs,
      };
    } else {
      onStatusUpdate?.('failed', { error: result.error });
      return {
        success: false,
        message: result.error || 'Implementation failed',
        outputs,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    onStatusUpdate?.('error', { error: message });
    return {
      success: false,
      message,
      outputs,
    };
  }
}
