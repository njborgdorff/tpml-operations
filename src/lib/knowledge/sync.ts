/**
 * Knowledge Base Sync Utility
 *
 * Syncs project data from the database to markdown files in the knowledge base.
 * This ensures AI roles always have access to current project information.
 */

import { prisma } from '@/lib/db/prisma';
import fs from 'fs/promises';
import path from 'path';

const KNOWLEDGE_BASE_PATH = 'C:/tpml-ai-team/tpml-core/knowledge';

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

/**
 * Sync all project data to the knowledge base.
 * Call this after any project status change.
 */
export async function syncKnowledgeBase(): Promise<{
  success: boolean;
  projectCount: number;
  error?: string;
}> {
  try {
    // Get all projects with their clients
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        sprints: { orderBy: { number: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group projects by client
    const projectsByClient: Record<string, ProjectWithDetails[]> = {};
    for (const project of projects) {
      const clientSlug = project.client.slug;
      if (!projectsByClient[clientSlug]) {
        projectsByClient[clientSlug] = [];
      }
      projectsByClient[clientSlug].push(project as ProjectWithDetails);
    }

    // Generate and write client profile files
    for (const [clientSlug, clientProjects] of Object.entries(projectsByClient)) {
      const client = clientProjects[0].client;
      const filePath = path.join(KNOWLEDGE_BASE_PATH, 'clients', `${clientSlug}.md`);

      const content = generateClientProfile(client, clientProjects);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);
    }

    // Generate summary file
    const summaryPath = path.join(KNOWLEDGE_BASE_PATH, 'resources', 'active-projects.md');
    const summaryContent = generateProjectSummary(projects as ProjectWithDetails[]);
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, summaryContent);

    console.log(`[KnowledgeSync] Synced ${projects.length} projects to knowledge base`);

    return {
      success: true,
      projectCount: projects.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[KnowledgeSync] Failed:', message);

    return {
      success: false,
      projectCount: 0,
      error: message,
    };
  }
}

function generateClientProfile(client: Client, projects: ProjectWithDetails[]): string {
  const now = new Date().toISOString().split('T')[0];

  const projectRows = projects.map(p => {
    const activeSprint = p.sprints.find(s => s.status === 'IN_PROGRESS');
    const sprintInfo = activeSprint
      ? `Sprint ${activeSprint.number}`
      : (p.sprints.length > 0 ? `${p.sprints.length} sprints planned` : 'No sprints');

    return `| ${p.name} | ${p.status} | ${p.createdAt.toISOString().split('T')[0]} | ${sprintInfo} |`;
  }).join('\n');

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
*Dashboard: https://dashboard.totalproductmgmt.com*
`;
}
