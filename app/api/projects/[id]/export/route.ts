import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { canRevealCloakedContacts, getCurrentDbUser, maskContactValue } from '@/lib/expert-access';
import { parseParams } from '@/lib/api-validate';
import { projectIdParamsSchema } from '@/lib/schemas/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paramsParsed = parseParams(projectIdParamsSchema, await params);
  if (!paramsParsed.success) return paramsParsed.response;
  const { id } = paramsParsed.data;
  const currentUser = await getCurrentDbUser();

  const project = await prisma.researchProject.findUnique({
    where: { id },
    include: {
      results: {
        include: { expert: { include: { contacts: true } } },
        orderBy: { matchScore: 'desc' },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const rows = [
    ['Name', 'Industry', 'Sub-Industry', 'Region', 'Tier', 'Match %', 'Contacts'],
    ...(await Promise.all(
      project.results.map(async (r) => {
        const expert = r.expert as typeof r.expert & { contactCloaked?: boolean };
        const canReveal = !expert.contactCloaked
          ? true
          : currentUser
            ? await canRevealCloakedContacts({
                userId: currentUser.id,
                expertId: expert.id,
                projectId: project.id,
              })
            : false;
        const contactValues = (expert.contacts ?? []).map((c) =>
          canReveal ? c.value : maskContactValue(c.value)
        );
        if (canReveal && contactValues.length > 0) {
          void prisma.$executeRawUnsafe(
            `INSERT INTO "contact_attempts" ("id", "expert_id", "created_at") VALUES ($1, $2, NOW())`,
            randomUUID(),
            expert.id
          ).catch(() => undefined);
        }
        return [
          expert.name,
          expert.industry,
          expert.subIndustry,
          expert.region,
          r.classificationTier,
          (r.matchScore * 100).toFixed(1),
          contactValues.join('; '),
        ];
      })
    )),
  ];

  const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const filename = `expert-hunt-${project.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
