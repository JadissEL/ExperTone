import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

const BATCH_LIMIT = 500;
const ADVISORY_LOCK_ID = 0x457870697279456e67696e; // "ExpiryEngine" in hex

/**
 * Expert Ownership Expiry Engine
 * Enforces the 30-day Global Pool rule with advisory locking.
 * Secured by CRON_SECRET (Vercel Cron sends Bearer token).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured', code: 'CONFIG_ERROR' },
      { status: 503 }
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = process.env.DRY_RUN === 'true';

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lockResult = await tx.$queryRaw<[{ pg_try_advisory_xact_lock: boolean }]>`
        SELECT pg_try_advisory_xact_lock(${ADVISORY_LOCK_ID}) as "pg_try_advisory_xact_lock"
      `;
      if (!lockResult[0]?.pg_try_advisory_xact_lock) {
        return { acquired: false, expired: 0, expertIds: [] as string[] };
      }

      const expiryDays = await getExpiryDays(tx);

      const candidates = await tx.$queryRaw<
        { id: string; name: string; owner_id: string }[]
      >(Prisma.sql`
        SELECT e.id, e.name, e.owner_id
        FROM experts e
        WHERE e.visibility_status = 'PRIVATE'
          AND (
            (e.private_expires_at IS NOT NULL AND e.private_expires_at <= now())
            OR (
              e.private_expires_at IS NULL
              AND (
                e.created_at <= now() - make_interval(days => ${expiryDays})
                OR (
                  e.last_contact_update IS NOT NULL
                  AND e.last_contact_update <= now() - make_interval(days => ${expiryDays})
                )
              )
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM expert_contacts ec
            WHERE ec.expert_id = e.id AND ec.is_verified = true
          )
        LIMIT ${BATCH_LIMIT}
        FOR UPDATE OF e SKIP LOCKED
      `);

      if (dryRun || candidates.length === 0) {
        return {
          acquired: true,
          expired: candidates.length,
          expertIds: candidates.map((c) => c.id),
          dryRun,
        };
      }

      const ids = candidates.map((c) => c.id);

      await tx.$executeRaw(Prisma.sql`
        UPDATE experts
        SET visibility_status = 'GLOBAL_POOL',
            private_expires_at = now()
        WHERE id IN (${Prisma.join(ids)})
      `);

      const auditData = candidates.map((c) => ({
        actorId: null as string | null,
        targetId: c.id,
        action: 'AUTO_EXPIRY' as const,
        metadata: {
          reason: 'Moved to global due to 30-day contact missing',
          expertName: c.name,
          previousOwnerId: c.owner_id,
        },
      }));
      const notificationData = candidates.map((c) => ({
        userId: c.owner_id,
        type: 'EXPERT_EXPIRED',
        title: 'Expert moved to Global Pool',
        body: `Expert ${c.name} has been moved to the Global Pool due to inactivity.`,
      }));
      if (auditData.length > 0) await tx.auditLog.createMany({ data: auditData });
      if (notificationData.length > 0) await tx.notification.createMany({ data: notificationData });

      return {
        acquired: true,
        expired: candidates.length,
        expertIds: ids,
        dryRun: false,
      };
    });

    if (!result.acquired) {
      return NextResponse.json(
        { ok: false, message: 'Another worker holds the lock', expired: 0 },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      expired: result.expired,
      expertIds: result.expertIds,
      dryRun: result.dryRun,
    });
  } catch (err) {
    logger.error({ err }, '[ExpiryEngine] Failed');
    return NextResponse.json(
      { error: 'Expiry job failed', code: 'CRON_ERROR', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function getExpiryDays(
  tx: Omit<
    typeof prisma,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >
): Promise<number> {
  const config = await tx.systemConfig.findUnique({
    where: { key: 'expiry_days' },
  });
  return config?.value ? (config.value as number) : 30;
}
