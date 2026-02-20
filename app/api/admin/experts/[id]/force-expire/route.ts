import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const { id: expertId } = await params;

  const expert = await prisma.expert.findUnique({ where: { id: expertId } });
  if (!expert) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }

  if (expert.visibilityStatus === 'GLOBAL_POOL') {
    return NextResponse.json(
      { error: 'Expert is already in Global Pool' },
      { status: 400 }
    );
  }

  await prisma.expert.update({
    where: { id: expertId },
    data: {
      visibilityStatus: 'GLOBAL_POOL',
      privateExpiresAt: new Date(),
    },
  });

  await createAuditLog({
    actorId: auth.user.id,
    targetId: expertId,
    action: 'FORCE_EXPIRE',
    metadata: { manualOverride: true },
  });

  return NextResponse.json({ ok: true });
}
