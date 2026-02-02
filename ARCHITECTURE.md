# TPML Operations Dashboard — Technical Architecture

## Metadata

- **Project:** TPML Operations Dashboard
- **Author:** CTO
- **Created:** January 31, 2025
- **Sprint:** 1
- **Status:** Ready for Implementation

---

## Overview

A Next.js 14 application that provides a command center for TPML's AI-staffed organization. The dashboard enables business-friendly project creation with automated AI planning workflows.

### Key Technical Challenges

1. **AI Orchestration:** Chain multiple Claude API calls (PM → CTO → Summary) with role prompt injection
2. **Real-time Processing:** Handle 60-90 second AI processing with good UX
3. **Artifact Generation:** Produce structured markdown documents matching manual workflow
4. **Conversation Continuity:** Store and inject conversation history (Sprint 2)

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 14.x |
| Runtime | Node.js | 20.x LTS |
| Language | TypeScript | 5.x (strict) |
| Database | PostgreSQL | 15.x (Neon) |
| ORM | Prisma | 5.x |
| Auth | NextAuth.js | 4.x |
| AI | Anthropic Claude API | claude-3-5-sonnet |
| Styling | Tailwind CSS + shadcn/ui | 3.4.x |
| Validation | Zod | 3.x |
| Hosting | Vercel | - |

Reference: `tpml-core/standards/TECH_STACK.md`

---

## Data Model

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTH
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  role          UserRole  @default(OWNER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  projects      Project[]
  sessions      Session[]

  @@map("users")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

enum UserRole {
  OWNER
  ADMIN
}

// ============================================
// CLIENTS
// ============================================

model Client {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  metadata  Json?    // Additional client info
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]

  @@map("clients")
}

// ============================================
// PROJECTS
// ============================================

model Project {
  id             String        @id @default(cuid())
  name           String
  slug           String        @unique
  status         ProjectStatus @default(INTAKE)

  // Intake data (business questions)
  intakeData     Json          // Structured intake form responses

  // AI-generated artifacts
  pmPlan         Json?         // PM output: MVP, sprints, backlog
  ctoArchitecture Json?        // CTO output: tech decisions, data model
  summary        String?       // One-page summary (markdown)

  // Approval
  approvalStatus ApprovalStatus @default(PENDING)
  approvalNotes  String?
  approvedAt     DateTime?

  // Relationships
  clientId       String
  ownerId        String

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  client         Client   @relation(fields: [clientId], references: [id])
  owner          User     @relation(fields: [ownerId], references: [id])
  sprints        Sprint[]
  conversations  Conversation[]
  artifacts      Artifact[]

  @@map("projects")
}

enum ProjectStatus {
  INTAKE      // Intake submitted, awaiting AI processing
  PLANNING    // AI processing in progress
  REVIEW      // Summary ready for owner review
  APPROVED    // Owner approved, ready for implementation
  ACTIVE      // Implementation in progress
  COMPLETED   // Project delivered
  CANCELLED   // Project cancelled
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REVISION_REQUESTED
  REJECTED
}

// ============================================
// SPRINTS
// ============================================

model Sprint {
  id          String       @id @default(cuid())
  projectId   String
  number      Int
  name        String?
  status      SprintStatus @default(PLANNED)
  goal        String?
  startDate   DateTime?
  endDate     DateTime?

  // Sprint review artifacts
  reviewSummary String?    // Written status document

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id])
  reviews     SprintReview[]

  @@unique([projectId, number])
  @@map("sprints")
}

enum SprintStatus {
  PLANNED
  ACTIVE
  REVIEW
  COMPLETED
}

model SprintReview {
  id              String   @id @default(cuid())
  sprintId        String

  // Debrief conversation
  conversationLog Json?    // Array of messages

  // Generated document
  statusDocument  String?  // Markdown

  createdAt       DateTime @default(now())

  sprint          Sprint   @relation(fields: [sprintId], references: [id])

  @@map("sprint_reviews")
}

// ============================================
// CONVERSATIONS (Sprint 2)
// ============================================

model Conversation {
  id        String   @id @default(cuid())
  projectId String

  role      String   // 'pm', 'cto', 'architect', 'owner'
  type      String   // 'planning', 'review', 'question', 'debrief'

  input     Json     // What was sent to AI
  output    Json     // What AI returned

  tokenCount Int?    // For tracking/limiting

  createdAt DateTime @default(now())

  project   Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, createdAt])
  @@map("conversations")
}

// ============================================
// ARTIFACTS
// ============================================

model Artifact {
  id        String       @id @default(cuid())
  projectId String

  type      ArtifactType
  name      String       // e.g., "BACKLOG.md", "ARCHITECTURE.md"
  content   String       // Markdown content
  version   Int          @default(1)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project   Project  @relation(fields: [projectId], references: [id])

  @@unique([projectId, type, version])
  @@map("artifacts")
}

enum ArtifactType {
  BACKLOG
  ARCHITECTURE
  HANDOFF_PM_TO_CTO
  HANDOFF_CTO_TO_IMPLEMENTER
  SUMMARY
  SPRINT_STATUS
}
```

### Entity Relationship Diagram

```
User (owner)
  │
  └──< Project >──┬── Client
                  │
                  ├──< Sprint >──< SprintReview
                  │
                  ├──< Conversation
                  │
                  └──< Artifact
```

---

## Application Structure

```
tpml-operations/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                    # Dashboard home / project list
│   │   │   ├── projects/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx            # Project intake form
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx            # Project detail
│   │   │   │       ├── review/
│   │   │   │       │   └── page.tsx        # Summary review & approval
│   │   │   │       └── sprints/
│   │   │   │           └── [number]/
│   │   │   │               └── page.tsx    # Sprint detail (Sprint 3)
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts                # POST: create project
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts            # GET, PATCH project
│   │   │   │       ├── generate-plan/
│   │   │   │       │   └── route.ts        # POST: trigger AI planning
│   │   │   │       ├── approve/
│   │   │   │       │   └── route.ts        # POST: approve/reject
│   │   │   │       └── artifacts/
│   │   │   │           └── route.ts        # GET: download artifacts
│   │   │   └── clients/
│   │   │       └── route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                             # shadcn/ui components
│   │   └── features/
│   │       ├── intake-form.tsx
│   │       ├── plan-summary.tsx
│   │       ├── approval-actions.tsx
│   │       ├── project-card.tsx
│   │       └── processing-status.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts                   # Anthropic client setup
│   │   │   ├── roles.ts                    # Load role prompts
│   │   │   ├── prompts/
│   │   │   │   ├── pm-planning.ts
│   │   │   │   ├── cto-architecture.ts
│   │   │   │   └── summary-generation.ts
│   │   │   └── workflow.ts                 # Orchestrate PM → CTO → Summary
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   ├── auth/
│   │   │   └── config.ts
│   │   ├── artifacts/
│   │   │   └── generator.ts                # Generate markdown files
│   │   └── utils/
│   │       └── index.ts
│   └── types/
│       ├── intake.ts                       # Zod schemas for intake
│       ├── plan.ts                         # AI output types
│       └── index.ts
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## AI Integration Design

### 1. Anthropic Client Setup

```typescript
// src/lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.7,
};
```

### 2. Role Prompt Loading

```typescript
// src/lib/ai/roles.ts
import fs from 'fs/promises';
import path from 'path';

const ROLE_PATHS = {
  pm: '../../tpml-core/roles/cto/pm.md',
  cto: '../../tpml-core/roles/cto/cto.md',
  architect: '../../tpml-core/roles/cto/architect.md',
} as const;

export type RoleType = keyof typeof ROLE_PATHS;

export async function loadRolePrompt(role: RoleType): Promise<string> {
  const filePath = path.join(process.cwd(), ROLE_PATHS[role]);
  return fs.readFile(filePath, 'utf-8');
}

export async function loadStandards(): Promise<{
  techStack: string;
  codingStandards: string;
}> {
  const basePath = path.join(process.cwd(), '../../tpml-core/standards');
  const [techStack, codingStandards] = await Promise.all([
    fs.readFile(path.join(basePath, 'TECH_STACK.md'), 'utf-8'),
    fs.readFile(path.join(basePath, 'CODING_STANDARDS.md'), 'utf-8'),
  ]);
  return { techStack, codingStandards };
}
```

### 3. Planning Workflow

```typescript
// src/lib/ai/workflow.ts
import { anthropic, AI_CONFIG } from './client';
import { loadRolePrompt, loadStandards } from './roles';
import { IntakeData, PMPlan, CTOArchitecture, ProjectSummary } from '@/types';

export interface PlanningResult {
  pmPlan: PMPlan;
  ctoArchitecture: CTOArchitecture;
  summary: string;
}

export async function runPlanningWorkflow(
  intake: IntakeData
): Promise<PlanningResult> {
  // Step 1: PM Planning
  const pmPlan = await runPMPlanning(intake);

  // Step 2: CTO Architecture
  const ctoArchitecture = await runCTOArchitecture(intake, pmPlan);

  // Step 3: Generate Summary
  const summary = await generateSummary(intake, pmPlan, ctoArchitecture);

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

Output your response as JSON matching this structure:
{
  "mvp": { "description": string, "features": string[] },
  "sprints": [{ "number": number, "name": string, "goal": string, "duration": string, "features": string[] }],
  "backlog": [{ "id": string, "feature": string, "priority": "P0"|"P1"|"P2", "acceptanceCriteria": string[], "sprint": number }],
  "timeline": string,
  "risks": string[]
}`;

  const response = await anthropic.messages.create({
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Project Intake:\n${JSON.stringify(intake, null, 2)}`
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  return JSON.parse(content.text) as PMPlan;
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

Output your response as JSON matching this structure:
{
  "techStack": { "framework": string, "database": string, "auth": string, "hosting": string, "notes": string },
  "dataModel": { "entities": [{ "name": string, "fields": string[], "relations": string[] }] },
  "apiRoutes": [{ "method": string, "path": string, "description": string }],
  "integrations": string[],
  "technicalRisks": string[]
}`;

  const response = await anthropic.messages.create({
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Project Intake:\n${JSON.stringify(intake, null, 2)}\n\nPM Plan:\n${JSON.stringify(pmPlan, null, 2)}`
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  return JSON.parse(content.text) as CTOArchitecture;
}

async function generateSummary(
  intake: IntakeData,
  pmPlan: PMPlan,
  ctoArchitecture: CTOArchitecture
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
      content: `Project: ${intake.name}\nClient: ${intake.client}\nProblem: ${intake.problemStatement}\n\nPM Plan Summary:\n- MVP: ${pmPlan.mvp.description}\n- Sprints: ${pmPlan.sprints.length}\n- Timeline: ${pmPlan.timeline}\n\nGenerate the business owner summary.`
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  return content.text;
}
```

### 4. API Route for Plan Generation

```typescript
// src/app/api/projects/[id]/generate-plan/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { runPlanningWorkflow } from '@/lib/ai/workflow';
import { getServerSession } from 'next-auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project with intake data
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update status to PLANNING
    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'PLANNING' },
    });

    // Run the AI planning workflow
    const result = await runPlanningWorkflow(project.intakeData as IntakeData);

    // Store results and update status
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        pmPlan: result.pmPlan,
        ctoArchitecture: result.ctoArchitecture,
        summary: result.summary,
        status: 'REVIEW',
      },
    });

    // Log conversation for continuity
    await prisma.conversation.createMany({
      data: [
        {
          projectId: params.id,
          role: 'pm',
          type: 'planning',
          input: project.intakeData,
          output: result.pmPlan,
        },
        {
          projectId: params.id,
          role: 'cto',
          type: 'planning',
          input: { intake: project.intakeData, pmPlan: result.pmPlan },
          output: result.ctoArchitecture,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      summary: result.summary,
      projectId: params.id,
    });

  } catch (error) {
    console.error('Plan generation failed:', error);

    // Revert status on failure
    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'INTAKE' },
    });

    return NextResponse.json(
      { error: 'Failed to generate plan' },
      { status: 500 }
    );
  }
}
```

---

## Intake Form Schema

```typescript
// src/types/intake.ts
import { z } from 'zod';

export const IntakeSchema = z.object({
  name: z.string().min(3).max(100),
  client: z.string().min(2),
  problemStatement: z.string().min(20).max(2000),
  targetUsers: z.string().min(10).max(1000),
  keyWorkflows: z.string().min(10).max(2000),
  successCriteria: z.string().min(10).max(1000),
  constraints: z.string().max(1000).optional(),
  timeline: z.string().max(200).optional(),
  budget: z.string().max(200).optional(),
});

export type IntakeData = z.infer<typeof IntakeSchema>;
```

---

## Environment Variables

```bash
# .env.local

# Database (Neon)
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Environment
NODE_ENV="development"
```

---

## Sprint 1 Implementation Scope

### Pages to Build

1. **Login** (`/login`) — Simple credentials auth
2. **Project Intake** (`/projects/new`) — Form with IntakeSchema fields
3. **Review** (`/projects/[slug]/review`) — Display summary, approve/reject buttons

### API Routes to Build

1. `POST /api/projects` — Create project from intake
2. `POST /api/projects/[id]/generate-plan` — Trigger AI workflow
3. `POST /api/projects/[id]/approve` — Approve/reject with notes
4. `GET /api/projects/[id]/artifacts` — Download generated markdown

### Components to Build

1. `IntakeForm` — Multi-section form with validation
2. `ProcessingStatus` — Show progress during AI generation
3. `PlanSummary` — Render markdown summary
4. `ApprovalActions` — Approve/Revision/Reject buttons

---

## Security Considerations

1. **Auth:** NextAuth with credentials provider, session-based
2. **API Protection:** All routes check session
3. **Input Validation:** Zod schemas on all inputs
4. **AI Safety:** Role prompts constrain AI output format
5. **Secrets:** API keys in environment variables only

---

## Performance Targets

| Metric | Target |
|--------|--------|
| AI Planning Workflow | < 90 seconds |
| Page Load (dashboard) | < 2 seconds |
| Form Submission | < 500ms |
| Database Queries | < 100ms |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-01-31 | Initial architecture | CTO |
