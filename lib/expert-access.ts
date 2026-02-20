import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function getCurrentDbUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, email: true, role: true },
  });
}

export function canViewComplianceScore(args: {
  user: { id: string; role: string } | null;
  projectCreatorId?: string | null;
}): boolean {
  if (!args.user) return false;
  if (ADMIN_ROLES.has(args.user.role)) return true;
  if (args.projectCreatorId && args.projectCreatorId === args.user.id) return true;
  return false;
}

export async function canRevealCloakedContacts(args: {
  userId: string;
  expertId: string;
  projectId?: string;
}): Promise<boolean> {
  const engagement = await prisma.engagement.findFirst({
    where: {
      expertId: args.expertId,
      ...(args.projectId ? { projectId: args.projectId } : {}),
      project: { creatorId: args.userId },
    },
    select: { id: true },
  });
  return !!engagement;
}

export function maskContactValue(value: string): string {
  if (!value) return '';
  if (value.includes('@')) {
    const [name = '', domain = ''] = value.split('@');
    const prefix = name.slice(0, 2);
    return `${prefix}***@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 4) return `***${digits.slice(-4)}`;
  return '***';
}
