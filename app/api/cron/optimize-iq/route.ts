import { NextRequest, NextResponse } from 'next/server';
import { runOptimizeIq } from '@/lib/optimize-iq';

/**
 * Weekly Recursive Learning: MAE check → ML retrain trigger; Tag evolution for Sidebar.
 * Secured by CRON_SECRET. Schedule: weekly (e.g. 0 3 * * 0 in vercel.json).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runOptimizeIq();
    return NextResponse.json({
      ok: true,
      mae: result.mae,
      maePct: result.maePct,
      sampleSize: result.sampleSize,
      retrainTriggered: result.retrainTriggered,
      retrainError: result.retrainError,
      tagsAdded: result.tagsAdded,
      highValueSubIndustries: result.highValueSubIndustries,
    });
  } catch (err) {
    console.error('[OptimizeIQ]', err);
    return NextResponse.json(
      { error: 'Optimize IQ failed', message: String(err) },
      { status: 500 }
    );
  }
}
