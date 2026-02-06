import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { ProjectStatus } from '@prisma/client';

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  let projects = null;
  let dbError = null;
  try {
    // Exact same query as /api/projects?filter=active
    projects = await prisma.project.findMany({
      where: {
        ownerId: userId ?? '',
        status: { not: ProjectStatus.FINISHED },
      },
      include: {
        client: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    userId,
    projectCount: projects?.length ?? 0,
    projectNames: projects?.map((p: { name: string; status: string }) => `${p.name} (${p.status})`) ?? [],
    dbError,
  });
}
