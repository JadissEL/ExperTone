import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const in24h = new Date(now.getTime() + day);
  const in7d = new Date(now.getTime() + 7 * day);
  const in15d = new Date(now.getTime() + 15 * day);

  const [privateExperts, count24h, count7d, count15d, autoTransferLogs, expiryDays] =
    await Promise.all([
      prisma.expert.findMany({
        where: {
          visibilityStatus: 'PRIVATE',
          privateExpiresAt: { not: null },
        },
        select: { id: true, name: true, privateExpiresAt: true, ownerId: true },
      }),
      prisma.expert.count({
        where: {
          visibilityStatus: 'PRIVATE',
          privateExpiresAt: { gte: now, lte: in24h },
        },
      }),
      prisma.expert.count({
        where: {
          visibilityStatus: 'PRIVATE',
          privateExpiresAt: { gte: in24h, lte: in7d },
        },
      }),
      prisma.expert.count({
        where: {
          visibilityStatus: 'PRIVATE',
          privateExpiresAt: { gte: in7d, lte: in15d },
        },
      }),
      prisma.auditLog.findMany({
        where: { action: 'FORCE_EXPIRE' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.systemConfig.findUnique({
        where: { key: 'expiry_days' },
      }),
    ]);

  const heatmap = {
    within24h: count24h,
    within7d: count7d,
    within15d: count15d,
  };

  const expiryDaysValue = expiryDays
    ? (expiryDays.value as number)
    : 30;

  return NextResponse.json({
    heatmap,
    privateExperts: privateExperts.slice(0, 100),
    autoTransferLogs,
    expiryDays: expiryDaysValue,
  });
}
