import { requireAdmin } from '@/lib/requireAdmin';
import { LiquidityCommandClient } from './LiquidityCommandClient';

export default async function AdminLiquidityPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Market Liquidity</h1>
      <p className="mt-1 text-sm text-slate-500">
        Supply vs. demand by segment; trigger Deep Scrape when supply &lt; 5 for a niche.
      </p>
      <LiquidityCommandClient />
    </div>
  );
}
