import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { SystemSettingsClient } from './SystemSettingsClient';

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [configs, users] = await Promise.all([
    prisma.systemConfig.findMany(),
    prisma.user.findMany({
      where: { role: { in: ['CSA', 'TEAM_LEAD'] } },
      select: { id: true, email: true },
    }),
  ]);

  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));
  const mlSensitivity = (configMap.ml_sensitivity as number) ?? 0.85;
  const expiryDays = (configMap.expiry_days as number) ?? 30;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">System Settings</h1>
      <p className="mt-1 text-slate-500">
        ML sensitivity, orchestration health, and bulk reclaim
      </p>

      <SystemSettingsClient
        mlSensitivity={mlSensitivity}
        expiryDays={expiryDays}
        users={users}
      />
    </div>
  );
}
