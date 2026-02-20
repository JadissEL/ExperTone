import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const schema = z.object({
  role: z.enum(['CSA', 'TEAM_LEAD', 'ADMIN', 'SUPER_ADMIN']),
});

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await _req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
  });

  await createAuditLog({
    actorId: auth.user.id,
    targetId: id,
    action: 'PROFILE_EDIT',
    metadata: { field: 'role', newValue: parsed.data.role },
  });

  return NextResponse.json({ ok: true });
}
