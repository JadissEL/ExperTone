import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const view = searchParams.get('view') ?? 'disputes';

  if (view === 'verified') {
    const experts = await prisma.expert.findMany({
      where: {
        contacts: {
          some: {
            isVerified: true,
            verifiedAt: { not: null },
          },
        },
      },
      include: {
        owner: { select: { id: true, email: true } },
        contacts: {
          where: { isVerified: true },
          select: { id: true, type: true, value: true, verifiedAt: true, verifiedBy: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ experts });
  }

  const tickets = await prisma.ticket.findMany({
    where: { status: 'OPEN' },
    include: {
      expert: {
        select: { id: true, name: true, industry: true, ownerId: true },
        include: { owner: { select: { id: true, email: true } } },
      },
      requester: { select: { id: true, email: true } },
      owner: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const users = await prisma.user.findMany({
    where: { role: { in: ['CSA', 'TEAM_LEAD'] } },
    select: { id: true, email: true },
  });

  return NextResponse.json({ tickets, users });
}
