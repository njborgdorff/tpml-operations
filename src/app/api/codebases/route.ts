import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// Mark this route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

/**
 * GET /api/codebases
 *
 * Lists existing project slugs that can be used as target codebases
 * for bug fixes and enhancements.
 *
 * Uses database records to determine available codebases since
 * Vercel serverless functions don't have access to local filesystem.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all projects that don't have a targetCodebase (i.e., they have their own folder)
    // These are the "root" projects that can be targets for bug fixes
    const projects = await prisma.project.findMany({
      where: {
        ownerId: session.user.id,
        targetCodebase: null, // Only projects with their own folder
      },
      select: {
        slug: true,
        name: true,
        status: true,
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform to codebase format
    const codebases = projects.map(project => ({
      name: project.slug,
      displayName: project.name,
      client: project.client.name,
      status: project.status,
      // These would be true if we could check the filesystem
      // For now, assume projects with IN_PROGRESS or later have src
      hasSrc: ['IN_PROGRESS', 'ACTIVE', 'COMPLETED'].includes(project.status),
      hasClaudeMd: true, // All projects created through dashboard have CLAUDE.md
    }));

    return NextResponse.json(codebases);
  } catch (error) {
    console.error('Failed to list codebases:', error);
    return NextResponse.json(
      { error: 'Failed to list codebases' },
      { status: 500 }
    );
  }
}
