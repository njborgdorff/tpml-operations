import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/config';

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    hasSession: !!session,
    hasUserId: !!session?.user?.id,
    userIdLength: session?.user?.id?.length ?? 0,
    userEmail: session?.user?.email ?? null,
  });
}
