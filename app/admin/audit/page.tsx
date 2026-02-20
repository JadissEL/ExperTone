import { requireAdmin } from '@/lib/requireAdmin';
import { SystemAuditTable } from './SystemAuditTable';

export default async function AdminAuditPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">System Audit Trail</h1>
      <p className="mt-1 text-slate-500">
        Immutable logs for ownership changes, tickets, exports, and profile edits
      </p>

      <SystemAuditTable />
    </div>
  );
}
