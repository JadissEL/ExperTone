import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function fallbackFromFeedbackLoop(expertId: string | undefined) {
  if (!expertId) return null;
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { averageActualRate: true },
  });
  const rate = expert?.averageActualRate;
  if (rate == null || rate <= 0) return null;
  return {
    suggested_rate_min: rate * 0.8,
    suggested_rate_max: rate * 1.2,
    predicted_rate: rate,
    source: 'feedback_loop',
    message: 'Safe rate estimate from historical actuals (ML unavailable).',
  };
}

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

  const { parseBody } = await import('@/lib/api-validate');
  const { mlSuggestedRateBodySchema } = await import('@/lib/schemas/api');
  const parsed = parseBody(mlSuggestedRateBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { expert_id, seniority_score, years_experience, country, region, industry } = parsed.data;

  try {
    const res = await fetch(`${ML_SERVICE_URL}/insights/suggested-rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seniority_score: seniority_score ?? 50,
        years_experience: years_experience ?? 5,
        country: country ?? '',
        region: region ?? '',
        industry: industry ?? 'Other',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const fallback = await fallbackFromFeedbackLoop(expert_id);
      if (fallback) return NextResponse.json(fallback);
      const err = await res.text();
      return NextResponse.json(
        { error: 'ML service error', details: err },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('ML suggested-rate error:', err);
    const fallback = await fallbackFromFeedbackLoop(expert_id);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json(
      {
        error: 'Failed to reach ML service',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
