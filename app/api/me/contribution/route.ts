import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';

/**
 * CSA Contribution Analytics: Database ROI + Ownership Health.
 * - databaseROI: sum(engagement.actualCost) for experts owned by current user.
 * - ownershipHealth: % of owned experts that stay PRIVATE (vs lost to Global Pool).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userDbId: string;
  try {
    userDbId = await getOrCreateCurrentUser();
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [ownedExperts, revenueRows] = await Promise.all([
    prisma.expert.findMany({
      where: { ownerId: userDbId },
      select: { id: true, visibilityStatus: true },
    }),
    prisma.engagement.aggregate({
      _sum: { actualCost: true },
      where: {
        expert: { ownerId: userDbId },
      },
    }),
  ]);

  const totalOwned = ownedExperts.length;
  const privateCount = ownedExperts.filter((e) => e.visibilityStatus === 'PRIVATE').length;
  const ownershipHealthPct = totalOwned > 0 ? Math.round((privateCount / totalOwned) * 100) : 100;

  return NextResponse.json({
    databaseROI: revenueRows._sum.actualCost ?? 0,
    totalOwned,
    privateCount,
    globalPoolCount: totalOwned - privateCount,
    ownershipHealthPct,
  });
}
