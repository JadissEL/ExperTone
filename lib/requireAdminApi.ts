import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

/**
 * Use in API route handlers. Returns { response } if unauthorized, else { user }.
 */
export async function requireAdminApi(): Promise<
  | { response: NextResponse; user?: never }
  | { response: null; user: { id: string; email: string; role: string } }
> {
  const { userId } = await auth();
  if (!userId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    response: null,
    user: { id: user.id, email: user.email, role: user.role },
  };
}
