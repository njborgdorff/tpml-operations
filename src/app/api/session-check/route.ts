import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  let projectCount = 0;
  let dbError = null;
  try {
    projectCount = await prisma.project.count({
      where: { ownerId: userId ?? '' },
    });
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    hasSession: !!session,
    hasUserId: !!userId,
    userId,
    userEmail: session?.user?.email ?? null,
    projectCount,
    dbError,
  });
}
