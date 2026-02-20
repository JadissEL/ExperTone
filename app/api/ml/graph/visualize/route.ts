import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text) rawBody = JSON.parse(text);
  } catch {
    rawBody = {};
  }

  const { parseBody } = await import('@/lib/api-validate');
  const { mlGraphVisualizeBodySchema } = await import('@/lib/schemas/api');
  const parsed = parseBody(mlGraphVisualizeBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { limit } = parsed.data;

  try {
    const res = await fetch(`${ML_SERVICE_URL}/graph/visualize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
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
    console.error('ML graph visualize error:', err);
    return NextResponse.json(
      {
        error: 'Failed to reach ML service',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
