import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const schema = z.object({
  newOwnerId: z.string().min(1),
});

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const { id: expertId } = await params;
  const body = await _req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    include: { owner: true },
  });
  if (!expert) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }

  const newOwner = await prisma.user.findUnique({
    where: { id: parsed.data.newOwnerId },
  });
  if (!newOwner) {
    return NextResponse.json({ error: 'New owner not found' }, { status: 404 });
  }

  const previousOwnerId = expert.ownerId;

  await prisma.$transaction(async (tx) => {
    await tx.expert.update({
      where: { id: expertId },
      data: { ownerId: parsed.data.newOwnerId },
    });

    const openTicket = await tx.ticket.findFirst({
      where: { expertId, status: 'OPEN' },
    });
    if (openTicket) {
      await tx.ticket.update({
        where: { id: openTicket.id },
        data: { status: 'RESOLVED', ownerId: parsed.data.newOwnerId },
      });
    } else {
      await tx.ticket.create({
        data: {
          requesterId: auth.user.id,
          expertId,
          ownerId: parsed.data.newOwnerId,
          status: 'RESOLVED',
        },
      });
    }
  });

  await createAuditLog({
    actorId: auth.user.id,
    targetId: expertId,
    action: 'OWNERSHIP_CHANGE',
    metadata: {
      previousOwnerId,
      newOwnerId: parsed.data.newOwnerId,
      resolvedByAdmin: true,
    },
  });

  return NextResponse.json({ ok: true });
}
