import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { parseBody } from '@/lib/api-validate';
import { ticketBodySchema } from '@/lib/schemas/api';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = parseBody(ticketBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { expertId, ownerId } = parsed.data;

  const requesterId = await getOrCreateCurrentUser();

  const ticket = await prisma.ticket.create({
    data: {
      expertId,
      requesterId,
      ownerId,
      status: 'OPEN',
    },
  });

  return NextResponse.json({ id: ticket.id, status: ticket.status });
}
