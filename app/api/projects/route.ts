import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) {
    return NextResponse.json({ projects: [] });
  }

  const projects = await prisma.researchProject.findMany({
    where: { creatorId: user.id },
    orderBy: { id: 'desc' },
    include: { _count: { select: { results: true } } },
  });

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      _count: p._count,
    })),
  });
}
