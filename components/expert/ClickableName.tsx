'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export type DisambiguationCandidate = {
  id: string;
  expertId: string;
  photoUrl: string | null;
  headline: string;
  company: string;
  location: string;
  industry: string;
  education: string;
  summary: string;
  matchScore: number;
  confidence: number;
};

export type ResolveResponse =
  | { resolved: true; expert: { id: string; name: string; [k: string]: unknown } }
  | { resolved: false; candidates: DisambiguationCandidate[] };

interface ClickableNameProps {
  name: string;
  expertId?: string;
  matchScore?: number;
  projectId?: string;
  onResolved: (expertId: string) => void;
  onDisambiguation: (candidates: DisambiguationCandidate[], name: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function ClickableName({
  name,
  expertId,
  matchScore,
  projectId,
  onResolved,
  onDisambiguation,
  className = '',
  children,
}: ClickableNameProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ name });
      if (projectId) params.set('projectId', projectId);
      if (expertId) params.set('expertId', expertId);
      if (matchScore != null) params.set('matchScore', String(matchScore));
      const res = await fetch(`/api/experts/resolve?${params}`, { credentials: 'include' });
      const data: ResolveResponse = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to resolve');
      if (data.resolved) {
        onResolved(data.expert.id);
      } else {
        onDisambiguation(data.candidates, name);
      }
    } catch (err) {
      console.error('[ClickableName]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`cursor-pointer text-left hover:underline focus:outline-none focus:ring-1 focus:ring-slate-500 focus:ring-offset-1 rounded disabled:opacity-70 ${className}`}
      title="View expert profile"
    >
      {loading ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {children ?? name}
        </span>
      ) : (
        children ?? name
      )}
    </button>
  );
}
