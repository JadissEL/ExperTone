import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEmbedding, isCircuitOpen } from '@/lib/ml-client';

/**
 * Proxy to ML service /embeddings. Used for search intent processing.
 * Falls back to 502 when ML is down (circuit open).
 */
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
  const { mlEmbeddingBodySchema } = await import('@/lib/schemas/api');
  const parsed = parseBody(mlEmbeddingBodySchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { text } = parsed.data;

  if (isCircuitOpen()) {
    return NextResponse.json(
      { error: 'ML_SERVICE_UNAVAILABLE', fallback: 'basic_search' },
      { status: 503 }
    );
  }

  try {
    const embedding = await getEmbedding(text);
    return NextResponse.json({ embedding, dimensions: embedding.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json(
      { error: 'Embedding failed', details: msg, fallback: 'basic_search' },
      { status: 502 }
    );
  }
}
