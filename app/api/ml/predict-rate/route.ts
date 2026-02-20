import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
  const { mlPredictRateBodySchema } = await import('@/lib/schemas/api');
  const parsed = parseBody(mlPredictRateBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { text } = parsed.data;

  try {
    const res = await fetch(`${ML_SERVICE_URL}/predict-rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: 'ML service error', details: err },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('ML predict-rate error:', err);
    return NextResponse.json(
      {
        error: 'Failed to reach ML service',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
