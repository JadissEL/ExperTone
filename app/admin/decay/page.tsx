import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { DataDecayMonitorClient } from './DataDecayMonitorClient';

export default async function AdminDecayPage() {
  await requireAdmin();

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const in24h = new Date(now.getTime() + day);
  const in7d = new Date(now.getTime() + 7 * day);
  const in15d = new Date(now.getTime() + 15 * day);

  const [count24h, count7d, count15d, autoTransferLogs, expiryConfig] =
    await Promise.all([
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
        where: { action: { in: ['FORCE_EXPIRE', 'AUTO_EXPIRY'] } },
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

  const expiryDays = expiryConfig?.value ? (expiryConfig.value as number) : 30;

  const serializedLogs = autoTransferLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Data Decay Monitor</h1>
      <p className="mt-1 text-slate-500">
        Expiry pipeline, automation control, and auto-transfer logs
      </p>

      <DataDecayMonitorClient
        heatmap={heatmap}
        autoTransferLogs={serializedLogs}
        expiryDays={expiryDays}
      />
    </div>
  );
}
