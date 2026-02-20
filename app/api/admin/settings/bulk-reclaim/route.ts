import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const schema = z.object({
  expertIds: z.array(z.string()).min(1).max(500),
  newOwnerId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const newOwner = await prisma.user.findUnique({
    where: { id: parsed.data.newOwnerId },
  });
  if (!newOwner) {
    return NextResponse.json({ error: 'New owner not found' }, { status: 404 });
  }

  const experts = await prisma.expert.findMany({
    where: {
      id: { in: parsed.data.expertIds },
      visibilityStatus: 'GLOBAL_POOL',
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const e of experts) {
      await tx.expert.update({
        where: { id: e.id },
        data: {
          ownerId: parsed.data.newOwnerId,
          visibilityStatus: 'PRIVATE',
          privateExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  });

  await createAuditLog({
    actorId: auth.user.id,
    targetId: experts[0]?.id ?? undefined,
    action: 'BULK_RECLAIM',
    metadata: {
      expertIds: parsed.data.expertIds,
      newOwnerId: parsed.data.newOwnerId,
      count: experts.length,
    },
  });

  return NextResponse.json({ ok: true, reclaimed: experts.length });
}
