import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs/promises';
import path from 'path';

const KNOWLEDGE_BASE_PATH = 'C:/tpml-ai-team/tpml-core/knowledge';

/**
 * POST /api/knowledge/sync
 *
 * Syncs project data from the database to the knowledge base markdown files.
 * This ensures AI roles (CTO, COO, etc.) have access to current project information.
 */
export async function POST(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all projects with their clients
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        sprints: { orderBy: { number: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group projects by client
    const projectsByClient: Record<string, typeof projects> = {};
    for (const project of projects) {
      const clientSlug = project.client.slug;
      if (!projectsByClient[clientSlug]) {
        projectsByClient[clientSlug] = [];
      }
      projectsByClient[clientSlug].push(project);
    }

    // Generate and write client profile files
    const results: { client: string; path: string; projectCount: number }[] = [];

    for (const [clientSlug, clientProjects] of Object.entries(projectsByClient)) {
      const client = clientProjects[0].client;
      const filePath = path.join(KNOWLEDGE_BASE_PATH, 'clients', `${clientSlug}.md`);

      const content = generateClientProfile(client, clientProjects);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);

      results.push({
        client: client.name,
        path: filePath,
        projectCount: clientProjects.length,
      });
    }

    // Also generate a summary file for quick reference
    const summaryPath = path.join(KNOWLEDGE_BASE_PATH, 'resources', 'active-projects.md');
    const summaryContent = generateProjectSummary(projects);
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, summaryContent);

    return NextResponse.json({
      success: true,
      message: `Synced ${projects.length} projects to knowledge base`,
      clientProfiles: results,
      summaryPath,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Knowledge sync failed:', error);
    return NextResponse.json(
      { error: 'Failed to sync knowledge base' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/knowledge/sync
 *
 * Returns the current sync status and last sync time.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if summary file exists and get its modification time
    const summaryPath = path.join(KNOWLEDGE_BASE_PATH, 'resources', 'active-projects.md');
    let lastSyncTime: string | null = null;

    try {
      const stats = await fs.stat(summaryPath);
      lastSyncTime = stats.mtime.toISOString();
    } catch {
      // File doesn't exist yet
    }

    // Get project count from database
    const projectCount = await prisma.project.count();

    return NextResponse.json({
      lastSyncTime,
      projectCount,
      knowledgeBasePath: KNOWLEDGE_BASE_PATH,
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

interface Client {
  id: string;
  name: string;
  slug: string;
  metadata: unknown;
}

interface ProjectWithDetails {
  id: string;
  name: string;
  slug: string;
  status: string;
  approvalStatus: string;
  targetCodebase: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: Client;
  sprints: { number: number; name: string | null; status: string }[];
}

function generateClientProfile(client: Client, projects: ProjectWithDetails[]): string {
  const now = new Date().toISOString().split('T')[0];

  // Build project table
  const projectRows = projects.map(p => {
    const activeSprint = p.sprints.find(s => s.status === 'IN_PROGRESS');
    const sprintInfo = activeSprint
      ? `Sprint ${activeSprint.number}`
      : (p.sprints.length > 0 ? `${p.sprints.length} sprints planned` : 'No sprints');

    return `| ${p.name} | ${p.status} | ${p.createdAt.toISOString().split('T')[0]} | ${sprintInfo} |`;
  }).join('\n');

  // Determine if this is internal (TPML)
  const isInternal = client.slug.includes('tpml');

  return `# Client Profile: ${client.name}

## Metadata

- **Created:** 2025-01-31
- **Last Updated:** ${now}
- **Account Owner:** COO
- **Status:** Active
- **Auto-Generated:** Yes (synced from TPML Operations Dashboard)

## Company Overview

- **Company:** ${client.name}
${isInternal ? '- **Relationship:** Internal — TPML is both the operating entity and its own client' : '- **Relationship:** Portfolio company'}

## Active Projects

| Project | Status | Start Date | Current Sprint |
|---------|--------|------------|----------------|
${projectRows}

## Project Details

${projects.map(p => `### ${p.name}
- **Slug:** ${p.slug}
- **Status:** ${p.status}
- **Approval:** ${p.approvalStatus}
${p.targetCodebase ? `- **Target Codebase:** ${p.targetCodebase}` : ''}
- **Last Updated:** ${p.updatedAt.toISOString().split('T')[0]}
`).join('\n')}

---

*This file is auto-generated from the TPML Operations Dashboard. Last sync: ${now}*
`;
}

function generateProjectSummary(projects: ProjectWithDetails[]): string {
  const now = new Date().toISOString().split('T')[0];

  // Group by status
  const byStatus: Record<string, ProjectWithDetails[]> = {};
  for (const p of projects) {
    if (!byStatus[p.status]) byStatus[p.status] = [];
    byStatus[p.status].push(p);
  }

  const statusOrder = ['IN_PROGRESS', 'APPROVED', 'REVIEW', 'PLANNING', 'INTAKE', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

  let statusSections = '';
  for (const status of statusOrder) {
    const statusProjects = byStatus[status];
    if (statusProjects && statusProjects.length > 0) {
      statusSections += `\n### ${status} (${statusProjects.length})\n\n`;
      statusSections += '| Project | Client | Last Updated |\n';
      statusSections += '|---------|--------|-------------|\n';
      for (const p of statusProjects) {
        statusSections += `| ${p.name} | ${p.client.name} | ${p.updatedAt.toISOString().split('T')[0]} |\n`;
      }
    }
  }

  return `# Active Projects Summary

**Last Updated:** ${now}
**Total Projects:** ${projects.length}
**Auto-Generated:** Yes (synced from TPML Operations Dashboard)

## Quick Stats

| Status | Count |
|--------|-------|
${Object.entries(byStatus).map(([status, list]) => `| ${status} | ${list.length} |`).join('\n')}

## Projects by Status
${statusSections}

---

*This file is auto-generated. Query the TPML Operations Dashboard API for real-time data.*
*Sync endpoint: POST /api/knowledge/sync*
`;
}
