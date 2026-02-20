import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/requireAdminApi';
import { prisma } from '@/lib/prisma';
import { computeProfessionalAuthorityIndex } from '@/lib/compliance-guard';

/**
 * Scholar-agent style authority proof endpoint.
 * Authority index is immutable once written unless explicit override=true.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const { id } = await params;
  let body: { citationCount?: number; patentCount?: number; override?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const citationCount = Math.max(0, Number(body.citationCount ?? 0));
  const patentCount = Math.max(0, Number(body.patentCount ?? 0));
  const override = body.override === true;

  const existing = await prisma.expert.findUnique({
    where: { id },
    select: {
      id: true,
      professionalAuthorityIndex: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }

  if (existing.professionalAuthorityIndex != null && !override) {
    return NextResponse.json(
      {
        error: 'Professional Authority Index is immutable once set. Use override=true to force update.',
      },
      { status: 409 }
    );
  }

  const authority = computeProfessionalAuthorityIndex(citationCount, patentCount);
  const updated = await prisma.expert.update({
    where: { id },
    data: {
      citationCount,
      patentCount,
      professionalAuthorityIndex: authority,
    },
    select: {
      id: true,
      citationCount: true,
      patentCount: true,
      professionalAuthorityIndex: true,
    },
  });

  return NextResponse.json({
    expertId: updated.id,
    citationCount: updated.citationCount ?? 0,
    patentCount: updated.patentCount ?? 0,
    professionalAuthorityIndex: updated.professionalAuthorityIndex ?? null,
  });
}
