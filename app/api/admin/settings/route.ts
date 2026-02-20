import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/requireAdminApi';

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const configs = await prisma.systemConfig.findMany();
  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

  let mlHealth: 'ok' | 'error' = 'error';
  let n8nHealth: 'ok' | 'error' = 'error';

  try {
    const mlRes = await fetch(
      `${process.env.ML_SERVICE_URL ?? 'http://localhost:8000'}/health`,
      { signal: AbortSignal.timeout(3000) }
    );
    mlHealth = mlRes.ok ? 'ok' : 'error';
  } catch {
    mlHealth = 'error';
  }

  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL ?? process.env.N8N_BASE_URL ?? '';
    if (n8nUrl) {
      const base = n8nUrl.replace(/\/webhook.*$/, '');
      const n8nRes = await fetch(`${base}/healthz`, {
        signal: AbortSignal.timeout(3000),
      });
      n8nHealth = n8nRes.ok ? 'ok' : 'error';
    } else {
      n8nHealth = 'error';
    }
  } catch {
    n8nHealth = 'error';
  }

  return NextResponse.json({
    mlSensitivity: configMap.ml_sensitivity ?? 0.85,
    expiryDays: configMap.expiry_days ?? 30,
    mlHealth,
    n8nHealth,
  });
}
