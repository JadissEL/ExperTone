import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * High-Value Sub-industry taxonomy (Tag Evolution from optimize_iq).
 * Used by Sidebar Filters to merge with static SUB_INDUSTRIES.
 */
export async function GET() {
  const row = await prisma.systemConfig.findUnique({
    where: { key: 'high_value_sub_industries' },
  });
  const list = (row?.value as string[] | undefined) ?? [];
  return NextResponse.json({ highValueSubIndustries: list });
}
