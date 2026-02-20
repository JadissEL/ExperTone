import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { z } from 'zod';

const schema = z.object({
  expiryDays: z.number().min(1).max(90),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  await prisma.systemConfig.upsert({
    where: { key: 'expiry_days' },
    create: { key: 'expiry_days', value: parsed.data.expiryDays },
    update: { value: parsed.data.expiryDays },
  });

  return NextResponse.json({ ok: true, expiryDays: parsed.data.expiryDays });
}
