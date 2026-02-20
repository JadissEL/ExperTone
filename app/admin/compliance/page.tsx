import { requireAdmin } from '@/lib/requireAdmin';
import { ComplianceTrustClient } from './ComplianceTrustClient';

export default async function AdminCompliancePage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Compliance & Trust</h1>
      <p className="mt-1 text-slate-500">
        View experts by compliance score, MNPI risk, verified badge, and authority index. Scan, verify ID, or set authority.
      </p>
      <ComplianceTrustClient />
    </div>
  );
}
