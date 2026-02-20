import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { z } from 'zod';

const schema = z.object({
  threshold: z.number().min(0).max(1),
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
    where: { key: 'ml_sensitivity' },
    create: { key: 'ml_sensitivity', value: parsed.data.threshold },
    update: { value: parsed.data.threshold },
  });

  return NextResponse.json({ ok: true, threshold: parsed.data.threshold });
}
