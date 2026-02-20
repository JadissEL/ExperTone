import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const WINDOW_DAYS = 7;
const MAX_ATTEMPTS_WITHOUT_BOOKING = 3;

/**
 * No-Spam Auditor: lowers visibility for experts with >3 contact attempts/week
 * and no bookings. Secured by CRON_SECRET (Vercel Cron sends Bearer token).
 * Schedule: weekly (0 4 * * 0 = Sunday 4am).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Get expert IDs with contact attempts in the window
  const rows = await prisma.$queryRaw<{ expert_id: string }[]>`
    SELECT DISTINCT expert_id FROM contact_attempts
    WHERE created_at >= ${since}
  `;
  const expertIds = rows.map((r) => r.expert_id);
  if (expertIds.length === 0) {
    return NextResponse.json({ scannedExperts: 0, loweredVisibility: 0 });
  }

  const experts = await prisma.expert.findMany({
    where: { id: { in: expertIds } },
    select: { id: true, visibilityStatus: true },
  });

  let lowered = 0;
  for (const expert of experts) {
    const [attemptsResult, bookingsResult] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM contact_attempts
        WHERE expert_id = ${expert.id} AND created_at >= ${since}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM engagements
        WHERE expert_id = ${expert.id} AND date >= ${since}
      `,
    ]);
    const attempts = Number(attemptsResult[0]?.count ?? 0);
    const bookings = Number(bookingsResult[0]?.count ?? 0);

    if (attempts > MAX_ATTEMPTS_WITHOUT_BOOKING && bookings === 0 && expert.visibilityStatus !== 'PRIVATE') {
      await prisma.expert.update({
        where: { id: expert.id },
        data: { visibilityStatus: 'PRIVATE' },
      });
      lowered += 1;
    }
  }

  return NextResponse.json({
    scannedExperts: experts.length,
    loweredVisibility: lowered,
  });
}
