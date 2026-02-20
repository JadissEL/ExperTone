import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getCurrentDbUser } from '@/lib/expert-access';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const currentUser = await getCurrentDbUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body: { contactCloaked?: boolean; projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.contactCloaked !== 'boolean') {
    return NextResponse.json({ error: 'contactCloaked boolean is required' }, { status: 400 });
  }

  const expert = await prisma.expert.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!expert) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
  }

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
  const isOwner = expert.ownerId === currentUser.id;

  // Allow if admin, owner, or project creator (when projectId provided)
  let canToggle = isAdmin || isOwner;
  if (!canToggle && body.projectId) {
    const project = await prisma.researchProject.findUnique({
      where: { id: body.projectId },
      select: { creatorId: true },
    });
    const hasResult = await prisma.researchResult.findFirst({
      where: { projectId: body.projectId, expertId: id },
      select: { id: true },
    });
    canToggle = project?.creatorId === currentUser.id && !!hasResult;
  }

  if (!canToggle) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.$executeRaw`
    UPDATE experts SET contact_cloaked = ${body.contactCloaked} WHERE id = ${id}
  `;

  return NextResponse.json({
    expertId: id,
    contactCloaked: body.contactCloaked,
  });
}
