import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

/**
 * Requires the current user to be an Admin or SuperAdmin.
 * Use in Server Components or Server Actions.
 * Redirects to / if unauthorized.
 */
export async function requireAdmin(): Promise<{ userId: string; user: { id: string; email: string; role: string } }> {
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
    redirect('/');
  }

  return {
    userId,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Check if current user is admin (does not redirect).
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  return !!user && ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number]);
}
