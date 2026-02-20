import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { parseParams } from '@/lib/api-validate';
import { expertIdParamsSchema } from '@/lib/schemas/api';

const WINDOW_DAYS = 7;
const MAX_ATTEMPTS_WITHOUT_BOOKING = 3;

async function enforceNoSpam(expertId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [attempts, bookings] = await Promise.all([
    prisma.contactAttempt.count({
      where: { expertId, createdAt: { gte: since } },
    }),
    prisma.engagement.count({
      where: { expertId, date: { gte: since } },
    }),
  ]);

  const shouldThrottle = attempts > MAX_ATTEMPTS_WITHOUT_BOOKING && bookings === 0;
  if (shouldThrottle) {
    await prisma.expert.update({
      where: { id: expertId },
      data: { visibilityStatus: 'PRIVATE' },
    });
  }

  return { attempts, bookings, shouldThrottle };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const awaitedParams = await params;
  const paramsParsed = parseParams(expertIdParamsSchema, awaitedParams);
  if (!paramsParsed.success) return paramsParsed.response;
  const { id: expertId } = paramsParsed.data;
  const exists = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }

  await prisma.contactAttempt.create({
    data: { expertId },
  });

  const result = await enforceNoSpam(expertId);
  return NextResponse.json({
    expertId,
    weeklyContactAttempts: result.attempts,
    weeklyBookings: result.bookings,
    visibilityLowered: result.shouldThrottle,
  });
}
