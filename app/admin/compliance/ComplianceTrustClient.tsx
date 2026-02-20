'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ExpertRow = {
  id: string;
  name: string;
  industry: string;
  subIndustry: string;
  currentEmployer: string | null;
  complianceScore: number | null;
  mnpiRiskLevel: string | null;
  verifiedBadgeProvider: string | null;
  verifiedAt: string | null;
  citationCount: number | null;
  patentCount: number | null;
  professionalAuthorityIndex: number | null;
  contactCloaked: boolean;
};

type ListResponse = {
  experts: ExpertRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function ComplianceTrustClient() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [complianceMin, setComplianceMin] = useState('');
  const [complianceMax, setComplianceMax] = useState('');
  const [mnpiFilter, setMnpiFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [scanning, setScanning] = useState<Set<string>>(new Set());
  const [verifyModal, setVerifyModal] = useState<string | null>(null);
  const [authorityModal, setAuthorityModal] = useState<string | null>(null);

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '30');
    if (search) params.set('search', search);
    if (complianceMin) params.set('complianceMin', complianceMin);
    if (complianceMax) params.set('complianceMax', complianceMax);
    if (mnpiFilter !== 'all') params.set('mnpiRisk', mnpiFilter);
    if (verifiedFilter !== 'all') params.set('hasVerifiedBadge', verifiedFilter);
    const res = await fetch(`/api/admin/compliance?${params}`);
    if (!res.ok) return;
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, search, complianceMin, complianceMax, mnpiFilter, verifiedFilter]);

  useEffect(() => {
    fetchExperts();
  }, [fetchExperts]);

  const onScan = async (expertId: string) => {
    setScanning((s) => new Set(s).add(expertId));
    try {
      const res = await fetch('/api/compliance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId }),
      });
      if (res.ok) fetchExperts();
    } finally {
      setScanning((s) => {
        const next = new Set(s);
        next.delete(expertId);
        return next;
      });
    }
  };

  const onVerifyId = async (expertId: string, provider: string) => {
    const res = await fetch(`/api/experts/${expertId}/verify-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) {
      setVerifyModal(null);
      fetchExperts();
    }
  };

  const onSetAuthority = async (
    expertId: string,
    citationCount: number,
    patentCount: number,
    override: boolean
  ) => {
    const res = await fetch(`/api/experts/${expertId}/scholar-authority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citationCount, patentCount, override }),
    });
    if (res.ok) {
      setAuthorityModal(null);
      fetchExperts();
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name, industry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchExperts()}
          className="w-48"
        />
        <Input
          type="number"
          placeholder="Min score"
          value={complianceMin}
          onChange={(e) => setComplianceMin(e.target.value)}
          className="w-24"
          min={0}
          max={100}
        />
        <Input
          type="number"
          placeholder="Max score"
          value={complianceMax}
          onChange={(e) => setComplianceMax(e.target.value)}
          className="w-24"
          min={0}
          max={100}
        />
        <Select value={mnpiFilter} onValueChange={setMnpiFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="MNPI risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All MNPI</SelectItem>
            <SelectItem value="HIGH_RISK_MNPI">High risk</SelectItem>
            <SelectItem value="MEDIUM_RISK_MNPI">Medium risk</SelectItem>
            <SelectItem value="LOW_RISK_MNPI">Low risk</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Verified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Verified only</SelectItem>
            <SelectItem value="false">Unverified only</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => fetchExperts()} variant="outline">
          Apply
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : !data ? (
          <div className="p-8 text-center text-slate-500">Failed to load</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Expert</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Compliance</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">MNPI</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Verified</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Authority</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.experts.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-900">{e.name}</div>
                        <div className="text-xs text-slate-500">
                          {e.industry} / {e.subIndustry}
                        </div>
                        {e.currentEmployer && (
                          <div className="text-xs text-slate-400">{e.currentEmployer}</div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {e.complianceScore != null ? (
                          <Badge
                            variant={
                              e.complianceScore >= 80
                                ? 'default'
                                : e.complianceScore >= 50
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {e.complianceScore}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {e.mnpiRiskLevel ? (
                          <Badge
                            variant={
                              e.mnpiRiskLevel === 'HIGH_RISK_MNPI'
                                ? 'destructive'
                                : e.mnpiRiskLevel === 'MEDIUM_RISK_MNPI'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {e.mnpiRiskLevel.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {e.verifiedBadgeProvider ? (
                          <span className="text-emerald-600 text-xs">
                            {e.verifiedBadgeProvider}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {e.professionalAuthorityIndex != null ? (
                          <span>{e.professionalAuthorityIndex.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onScan(e.id)}
                            disabled={scanning.has(e.id)}
                          >
                            {scanning.has(e.id) ? '…' : 'Scan'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setVerifyModal(e.id)}
                          >
                            Verify ID
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAuthorityModal(e.id)}
                          >
                            Authority
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
                <span className="text-sm text-slate-500">
                  {data.total} experts · page {data.page} of {data.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page >= data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {verifyModal && (
        <VerifyIdModal
          expertId={verifyModal}
          onClose={() => setVerifyModal(null)}
          onSubmit={(provider) => onVerifyId(verifyModal, provider)}
        />
      )}
      {authorityModal && (
        <AuthorityModal
          expertId={authorityModal}
          onClose={() => setAuthorityModal(null)}
          onSubmit={onSetAuthority}
        />
      )}
    </div>
  );
}

function VerifyIdModal({
  expertId,
  onClose,
  onSubmit,
}: {
  expertId: string;
  onClose: () => void;
  onSubmit: (provider: string) => void;
}) {
  const [provider, setProvider] = useState('Persona');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg w-80">
        <h3 className="font-medium text-slate-900">Verify ID</h3>
        <p className="text-sm text-slate-500 mt-1">Expert: {expertId.slice(0, 8)}…</p>
        <Input
          placeholder="Provider (e.g. Persona, CLEAR)"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="mt-3"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(provider)}>Submit</Button>
        </div>
      </div>
    </div>
  );
}

function AuthorityModal({
  expertId,
  onClose,
  onSubmit,
}: {
  expertId: string;
  onClose: () => void;
  onSubmit: (expertId: string, citationCount: number, patentCount: number, override: boolean) => void;
}) {
  const [citationCount, setCitationCount] = useState('');
  const [patentCount, setPatentCount] = useState('');
  const [override, setOverride] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg w-80">
        <h3 className="font-medium text-slate-900">Set Authority Index</h3>
        <p className="text-sm text-slate-500 mt-1">Expert: {expertId.slice(0, 8)}…</p>
        <div className="mt-3 space-y-2">
          <Input
            type="number"
            min={0}
            placeholder="Citation count"
            value={citationCount}
            onChange={(e) => setCitationCount(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="Patent count"
            value={patentCount}
            onChange={(e) => setPatentCount(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
            />
            Override existing
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit(
                expertId,
                parseInt(citationCount, 10) || 0,
                parseInt(patentCount, 10) || 0,
                override
              )
            }
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
