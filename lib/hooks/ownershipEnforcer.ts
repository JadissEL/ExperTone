/**
 * Ownership Enforcer: checks last_contact_update and verified contact.
 * If past expiry days and no verified contact, triggers Global Pool transition.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const LOCK_ID = 0x457870697279456e67696e;

export interface EnforcerResult {
  acquired: boolean;
  expired: number;
  expertIds: string[];
  dryRun?: boolean;
}

type TxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

async function getExpiryDays(tx: TxClient): Promise<number> {
  const row = await tx.systemConfig.findUnique({ where: { key: 'expiry_days' } });
  return (row?.value as number) ?? 30;
}

export async function checkAndTransitionExpiredExperts(opts: { dryRun?: boolean; batchLimit?: number } = {}): Promise<EnforcerResult> {
  const dryRun = opts.dryRun ?? false;
  const batchLimit = opts.batchLimit ?? 500;

  const result = await prisma.$transaction(async (tx) => {
    const lock = await tx.$queryRaw<[{ pg_try_advisory_xact_lock: boolean }]>`
      SELECT pg_try_advisory_xact_lock(${LOCK_ID}) as "pg_try_advisory_xact_lock"
    `;
    if (!lock[0]?.pg_try_advisory_xact_lock) {
      return { acquired: false, expired: 0, expertIds: [] as string[] };
    }

    const expiryDays = await getExpiryDays(tx);
    const candidates = await tx.$queryRaw<{ id: string; name: string; owner_id: string }[]>(Prisma.sql`
      SELECT e.id, e.name, e.owner_id FROM experts e
      WHERE e.visibility_status = 'PRIVATE'
        AND (
          (e.private_expires_at IS NOT NULL AND e.private_expires_at <= now())
          OR (e.private_expires_at IS NULL AND (
            e.created_at <= now() - make_interval(days => ${expiryDays})
            OR (e.last_contact_update IS NOT NULL AND e.last_contact_update <= now() - make_interval(days => ${expiryDays}))
          ))
        )
        AND NOT EXISTS (SELECT 1 FROM expert_contacts ec WHERE ec.expert_id = e.id AND ec.is_verified = true)
      LIMIT ${batchLimit}
      FOR UPDATE OF e SKIP LOCKED
    `);

    if (dryRun || candidates.length === 0) {
      return { acquired: true, expired: candidates.length, expertIds: candidates.map((c) => c.id) };
    }

    const ids = candidates.map((c) => c.id);
    await tx.$executeRaw(Prisma.sql`
      UPDATE experts SET visibility_status = 'GLOBAL_POOL', private_expires_at = now(), reacquisition_priority = true WHERE id IN (${Prisma.join(ids)})
    `);
    const teamLeadIds = await tx.user.findMany({
      where: { role: 'TEAM_LEAD' },
      select: { id: true },
    });
    for (const c of candidates) {
      await tx.auditLog.create({
        data: { actorId: null, targetId: c.id, action: 'AUTO_EXPIRY', metadata: { expertName: c.name, previousOwnerId: c.owner_id, lifecycle: 'global_pool_transition' } },
      });
      await tx.notification.create({
        data: { userId: c.owner_id, type: 'EXPERT_EXPIRED', title: 'Expert moved to Global Pool', body: `${c.name} was moved. High priority for re-acquisition.` },
      });
      for (const tl of teamLeadIds) {
        if (tl.id !== c.owner_id) {
          await tx.notification.create({
            data: { userId: tl.id, type: 'GLOBAL_POOL_TRANSITION', title: 'Expert moved to Global Pool', body: `${c.name} (ex-owner ${c.owner_id}) is high priority for re-acquisition.` },
          });
        }
      }
    }
    return { acquired: true, expired: candidates.length, expertIds: ids };
  });

  return { ...result, dryRun };
}
