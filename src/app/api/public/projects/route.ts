import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/public/projects
 *
 * Public endpoint for external integrations (Slack bot, n8n, etc.)
 * Returns current project data without authentication.
 *
 * Query params:
 * - format: 'json' (default) | 'markdown' | 'summary'
 * - status: filter by status (e.g., 'ACTIVE', 'IN_PROGRESS')
 * - client: filter by client name
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const statusFilter = url.searchParams.get('status');
    const clientFilter = url.searchParams.get('client');

    // Build query
    const where: Record<string, unknown> = {};
    if (statusFilter) {
      where.status = statusFilter.toUpperCase();
    }
    if (clientFilter) {
      where.client = {
        name: { contains: clientFilter, mode: 'insensitive' },
      };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        sprints: {
          where: { status: 'IN_PROGRESS' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format response based on requested format
    if (format === 'markdown') {
      return new NextResponse(formatAsMarkdown(projects), {
        headers: { 'Content-Type': 'text/markdown' },
      });
    }

    if (format === 'summary') {
      return NextResponse.json(formatAsSummary(projects));
    }

    // Default: full JSON
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: projects.length,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        client: p.client.name,
        hasActiveSprint: p.sprints.length > 0,
        targetCodebase: p.targetCodebase,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Public projects API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

interface ProjectWithRelations {
  id: string;
  name: string;
  slug: string;
  status: string;
  targetCodebase: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: { name: string };
  sprints: { status: string }[];
}

function formatAsMarkdown(projects: ProjectWithRelations[]): string {
  const lines = [
    '# Active Projects',
    '',
    `**Last Updated:** ${new Date().toISOString().split('T')[0]}`,
    `**Total Projects:** ${projects.length}`,
    '',
    '| Project | Client | Status | Active Sprint |',
    '|---------|--------|--------|---------------|',
  ];

  for (const p of projects) {
    const hasActiveSprint = p.sprints.length > 0 ? '✓' : '';
    lines.push(`| ${p.name} | ${p.client.name} | ${p.status} | ${hasActiveSprint} |`);
  }

  lines.push('', '---', '*Source: TPML Operations Dashboard*');

  return lines.join('\n');
}

function formatAsSummary(projects: ProjectWithRelations[]): object {
  // Group by status
  const byStatus: Record<string, string[]> = {};
  for (const p of projects) {
    if (!byStatus[p.status]) byStatus[p.status] = [];
    byStatus[p.status].push(p.name);
  }

  // Group by client
  const byClient: Record<string, string[]> = {};
  for (const p of projects) {
    const clientName = p.client.name;
    if (!byClient[clientName]) byClient[clientName] = [];
    byClient[clientName].push(`${p.name} (${p.status})`);
  }

  return {
    timestamp: new Date().toISOString(),
    totalProjects: projects.length,
    byStatus,
    byClient,
    projectsWithActiveSprints: projects
      .filter((p) => p.sprints.length > 0)
      .map((p) => p.name),
  };
}
