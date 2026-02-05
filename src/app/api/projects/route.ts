import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { IntakeSchema, IntakeData, NewProjectData, NewFeatureData, BugFixData } from '@/types';
import { syncKnowledgeBase } from '@/lib/knowledge/sync';
import fs from 'fs/promises';
import path from 'path';

const PROJECTS_ROOT = 'C:/tpml-ai-team/projects';
const TEMPLATES_ROOT = 'C:/tpml-ai-team/tpml-core/templates/project-setup';

// Type guards for discriminated union
function isNewProject(data: IntakeData): data is NewProjectData {
  return data.projectType === 'NEW_PROJECT';
}

function isNewFeature(data: IntakeData): data is NewFeatureData {
  return data.projectType === 'NEW_FEATURE';
}

function isBugFix(data: IntakeData): data is BugFixData {
  return data.projectType === 'BUG_FIX';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Create the project folder structure with template files
 * Only used for NEW_PROJECT type - features/bug fixes use existing codebases
 */
async function createProjectFolder(slug: string, projectName: string, clientName: string, intakeData: NewProjectData): Promise<void> {
  const projectPath = path.join(PROJECTS_ROOT, slug);
  const docsPath = path.join(projectPath, 'docs');

  // Create directories
  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(docsPath, { recursive: true });

  // Create CLAUDE.md with project context
  const claudeMd = `# ${projectName}

## Client
${clientName}

## Problem Statement
${intakeData.problemStatement}

## Target Users
${intakeData.targetUsers}

## Key Workflows
${intakeData.keyWorkflows}

## Success Criteria
${intakeData.successCriteria}

${intakeData.timeline ? `## Timeline\n${intakeData.timeline}\n` : ''}
${intakeData.budget ? `## Budget\n${intakeData.budget}\n` : ''}
${intakeData.constraints ? `## Constraints\n${intakeData.constraints}\n` : ''}

## Project Structure

- \`docs/\` - Project documentation and handoffs
- \`src/\` - Source code (created during implementation)

## AI Team Instructions

This project is managed through the TPML Operations dashboard.
Artifacts (BACKLOG.md, ARCHITECTURE.md, etc.) will be generated automatically
and stored in both the database and the \`docs/\` folder.
`;

  await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), claudeMd);

  // Create initial PROJECT_STATUS.md
  const statusMd = `# Project Status: ${projectName}

## Current Phase
INTAKE - Awaiting AI team planning

## Last Updated
${new Date().toISOString().split('T')[0]}

## Summary
Project created. Waiting for PM and CTO to generate development plan.

## Next Steps
1. Generate plan using the dashboard
2. Review and approve the plan
3. Begin implementation
`;

  await fs.writeFile(path.join(docsPath, 'PROJECT_STATUS.md'), statusMd);

  // Copy template files if they exist
  try {
    const templates = ['TEAM_LOG.md'];
    for (const template of templates) {
      const templatePath = path.join(TEMPLATES_ROOT, template);
      const destPath = path.join(docsPath, template);
      try {
        const content = await fs.readFile(templatePath, 'utf-8');
        await fs.writeFile(destPath, content.replace(/\{\{PROJECT_NAME\}\}/g, projectName));
      } catch {
        // Template doesn't exist, skip
      }
    }
  } catch {
    // Templates folder doesn't exist, skip
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = IntakeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Find or create client
    let client = await prisma.client.findFirst({
      where: { name: { equals: data.client, mode: 'insensitive' } },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: data.client,
          slug: slugify(data.client),
        },
      });
    }

    // Create project with unique slug
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.project.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Build project data based on project type
    // Note: projectType and bugDescription fields require `prisma generate` after migration
    const projectData = {
      name: data.name,
      slug,
      intakeData: data,
      clientId: client.id,
      ownerId: session.user.id,
      status: 'INTAKE' as const,
      projectType: data.projectType,
      targetCodebase: data.targetCodebase || null,
      bugDescription: isBugFix(data) ? data.bugDescription : null,
    };

    const project = await prisma.project.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: projectData as any, // Type includes new schema fields that require prisma generate
      include: { client: true },
    });

    console.log(`[Projects] Created ${data.projectType}: ${project.name} (${slug})`);

    // Only create project folder structure for NEW_PROJECT type
    // NEW_FEATURE and BUG_FIX use existing codebases
    if (isNewProject(data) && !data.targetCodebase) {
      try {
        await createProjectFolder(slug, data.name, client.name, data);
        console.log(`[Projects] Created folder for new project: ${slug}`);
      } catch (folderError) {
        console.error(`[Projects] Failed to create folder for ${slug}:`, folderError);
        // Don't fail the request - folder creation is secondary
      }
    } else if (data.targetCodebase) {
      console.log(`[Projects] Using existing codebase: ${data.targetCodebase}`);
    }

    // Sync knowledge base (fire and forget)
    syncKnowledgeBase().catch(err => console.error('[Projects] Knowledge sync failed:', err));

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { ownerId: session.user.id },
      include: { client: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
