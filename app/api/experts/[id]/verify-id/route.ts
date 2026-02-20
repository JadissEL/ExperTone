import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { prisma } from '@/lib/prisma';

/**
 * Admin/System endpoint to attach third-party ID verification.
 * Provider examples: Persona, CLEAR.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const { id } = await params;
  let body: { provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const provider = (body.provider ?? '').trim();
  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }

  const updated = await prisma.expert.update({
    where: { id },
    data: {
      verifiedBadgeProvider: provider,
      verifiedAt: new Date(),
    },
    select: {
      id: true,
      verifiedBadgeProvider: true,
      verifiedAt: true,
    },
  });

  return NextResponse.json({
    expertId: updated.id,
    verifiedBadgeProvider: updated.verifiedBadgeProvider,
    verifiedAt: updated.verifiedAt?.toISOString() ?? null,
  });
}
