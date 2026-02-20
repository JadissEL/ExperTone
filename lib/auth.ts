import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * Gets or creates the current user in the database from Clerk.
 * Returns the User id for use as ownerId, etc.
 */
export async function getOrCreateCurrentUser(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const email = (sessionClaims?.email as string) ?? `${userId}@clerk.user`;

  let user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkUserId: userId,
        email,
        role: 'CSA',
      },
    });
  }

  return user.id;
}
