import { anthropic, AI_CONFIG } from './client';
import { loadRolePrompt, loadStandards } from './roles';
import type { IntakeData, PMPlan, CTOArchitecture, PlanningResult } from '@/types';

export async function runPlanningWorkflow(
  intake: IntakeData
): Promise<PlanningResult> {
  // Step 1: PM Planning
  console.log('Starting PM planning...');
  const pmPlan = await runPMPlanning(intake);
  console.log('PM planning complete');

  // Step 2: CTO Architecture
  console.log('Starting CTO architecture...');
  const ctoArchitecture = await runCTOArchitecture(intake, pmPlan);
  console.log('CTO architecture complete');

  // Step 3: Generate Summary
  console.log('Generating summary...');
  const summary = await generateSummary(intake, pmPlan, ctoArchitecture);
  console.log('Summary complete');

  return { pmPlan, ctoArchitecture, summary };
}

async function runPMPlanning(intake: IntakeData): Promise<PMPlan> {
  const rolePrompt = await loadRolePrompt('pm');

  const systemPrompt = `${rolePrompt}

---

You are acting as the PM for a new project intake. Your job is to:
1. Define the MVP scope
2. Break the project into sprints (1-2 weeks each)
3. Create a prioritized backlog with acceptance criteria

IMPORTANT: Output ONLY valid JSON matching this structure, no markdown code blocks:
{
  "mvp": { "description": "string", "features": ["string"] },
  "sprints": [{ "number": 1, "name": "string", "goal": "string", "duration": "string", "features": ["string"] }],
  "backlog": [{ "id": "S1-1", "feature": "string", "priority": "P0", "acceptanceCriteria": ["string"], "sprint": 1 }],
  "timeline": "string",
  "risks": ["string"]
}

Priority levels:
- P0: Must have for the sprint to be complete
- P1: Should have, include if time permits
- P2: Nice to have, defer if needed`;

  const response = await anthropic.messages.create({
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Create a sprint plan for this project:

Project Name: ${intake.name}
Client: ${intake.client}
Problem Statement: ${intake.problemStatement}
Target Users: ${intake.targetUsers}
Key Workflows: ${intake.keyWorkflows}
Success Criteria: ${intake.successCriteria}
${intake.timeline ? `Timeline: ${intake.timeline}` : ''}
${intake.budget ? `Budget: ${intake.budget}` : ''}
${intake.constraints ? `Constraints: ${intake.constraints}` : ''}`
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  // Extract JSON from response (handle possible markdown wrapping)
  let jsonText = content.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  try {
    return JSON.parse(jsonText) as PMPlan;
  } catch {
    console.error('Failed to parse PM response:', jsonText);
    throw new Error('Failed to parse PM planning response');
  }
}

async function runCTOArchitecture(
  intake: IntakeData,
  pmPlan: PMPlan
): Promise<CTOArchitecture> {
  const [rolePrompt, standards] = await Promise.all([
    loadRolePrompt('cto'),
    loadStandards(),
  ]);

  const systemPrompt = `${rolePrompt}

---

TPML Tech Stack:
${standards.techStack}

---

You are acting as the CTO/Architect for a new project. The PM has already created a sprint plan.
Your job is to:
1. Confirm tech stack (use TPML standard unless deviation needed)
2. Design the data model
3. Define API contracts for Sprint 1
4. Identify integration points

IMPORTANT: Output ONLY valid JSON matching this structure, no markdown code blocks:
{
  "techStack": { "framework": "string", "database": "string", "auth": "string", "hosting": "string", "notes": "string" },
  "dataModel": { "entities": [{ "name": "string", "fields": ["string"], "relations": ["string"] }] },
  "apiRoutes": [{ "method": "GET", "path": "/api/...", "description": "string" }],
  "integrations": ["string"],
  "technicalRisks": ["string"]
}`;

  const response = await anthropic.messages.create({
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Design the technical architecture for this project:

Project Name: ${intake.name}
Problem Statement: ${intake.problemStatement}
Key Workflows: ${intake.keyWorkflows}

PM Sprint Plan:
- MVP: ${pmPlan.mvp.description}
- Sprints: ${pmPlan.sprints.length}
- Timeline: ${pmPlan.timeline}

Sprint 1 Features:
${pmPlan.backlog.filter(b => b.sprint === 1).map(b => `- ${b.feature}`).join('\n')}`
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  let jsonText = content.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  try {
    return JSON.parse(jsonText) as CTOArchitecture;
  } catch {
    console.error('Failed to parse CTO response:', jsonText);
    throw new Error('Failed to parse CTO architecture response');
  }
}

async function generateSummary(
  intake: IntakeData,
  pmPlan: PMPlan,
  _ctoArchitecture: CTOArchitecture
): Promise<string> {
  const systemPrompt = `You are generating a one-page summary for a business owner.

IMPORTANT RULES:
- Use business language only, NO technical jargon
- Do not mention frameworks, databases, or architecture details
- Focus on: what will be built, how long it takes, what decisions the owner needs to make
- Keep it under 500 words
- Format as markdown

Output a summary with these sections:
## What We're Building
## Sprint Plan
## Timeline
## Decisions Needed From You
## What You'll See After Sprint 1`;

  const response = await anthropic.messages.create({
    model: AI_CONFIG.model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Generate a business owner summary for:

Project: ${intake.name}
Client: ${intake.client}
Problem: ${intake.problemStatement}
Success Criteria: ${intake.successCriteria}

PM Plan:
- MVP: ${pmPlan.mvp.description}
- Number of Sprints: ${pmPlan.sprints.length}
- Timeline: ${pmPlan.timeline}
- Sprints:
${pmPlan.sprints.map(s => `  Sprint ${s.number}: ${s.name} (${s.duration}) - ${s.goal}`).join('\n')}

Key Risks:
${pmPlan.risks.map(r => `- ${r}`).join('\n')}`
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  return content.text;
}
