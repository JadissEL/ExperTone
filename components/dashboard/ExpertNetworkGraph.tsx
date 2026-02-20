'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d').then((mod) => mod.default),
  { ssr: false }
);

interface GraphNode {
  id: string;
  label: string;
  group: string;
  val: number;
  community?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const LINK_LABELS: Record<string, string> = {
  SHARED_EMPLOYER: 'Same employer',
  SAME_SUBINDUSTRY: 'Same sub-industry',
  WORKED_AT: 'Worked at',
  HAS_SKILL: 'Has skill',
  IN_INDUSTRY: 'In industry',
};

export function ExpertNetworkGraph({ focusExpertId }: { focusExpertId: string | null }) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/ml/graph/visualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 150 }),
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((d) => {
        setData(d);
      })
      .catch((e) => {
        setError(e.message || 'Failed to load graph');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);


  const nodesById = data ? new Map(data.nodes.map((n) => [n.id, n])) : new Map<string, GraphNode>();
  const linksWithObjects = data
    ? data.links
        .map((l) => {
          const src = typeof l.source === 'string' ? nodesById.get(l.source) : (l.source as GraphNode);
          const tgt = typeof l.target === 'string' ? nodesById.get(l.target) : (l.target as GraphNode);
          if (!src || !tgt) return null;
          return { ...l, source: src, target: tgt };
        })
        .filter(Boolean) as { source: GraphNode; target: GraphNode; type?: string }[]
    : [];

  const graphData = { nodes: data?.nodes ?? [], links: linksWithObjects };

  const getNodeColor = useCallback((node: GraphNode) => {
    if (focusExpertId && node.id === focusExpertId) return '#38bdf8';
    switch (node.group) {
      case 'expert':
        return '#4a9eff';
      case 'company':
        return '#22c55e';
      case 'industry':
        return '#a78bfa';
      case 'skill':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  }, [focusExpertId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Loading network...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 text-sm">
        {error}. Run <code className="bg-slate-800 px-1 rounded">npm run ml:start</code> for graph data.
      </div>
    );
  }

  if (!data || (!data.nodes?.length && !data.links?.length)) {
    return (
      <div className="p-4 text-slate-500 text-sm text-center">
        No graph data. Add experts with past employers and skills to see the relationship hub.
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden bg-slate-900/50 border border-slate-700/50">
      <ForceGraph2D
        graphData={graphData}
        nodeLabel={(n) => `${(n as GraphNode).label} (${(n as GraphNode).group})`}
        nodeColor={(n) => getNodeColor(n as GraphNode)}
        nodeVal={(n) => ((n as GraphNode).val || 1) * 3}
        linkLabel={(l) => {
          const t = (l as { type?: string }).type;
          return t ? LINK_LABELS[t] || t : 'Connection';
        }}
        linkColor={() => 'rgba(148, 163, 184, 0.5)'}
        linkWidth={1}
        onLinkHover={(l) => setHoveredLink(l as GraphLink | null)}
        backgroundColor="rgba(15, 23, 42, 0.6)"
      />
      {hoveredLink && (
        <div className="absolute bottom-2 left-2 right-2 py-1.5 px-2 rounded bg-slate-800/95 text-slate-300 text-xs border border-slate-600/50">
          Who knows who: {(hoveredLink as { type?: string }).type ? LINK_LABELS[(hoveredLink as { type?: string }).type!] || (hoveredLink as { type?: string }).type : 'Connection'}
        </div>
      )}
      <div className="absolute top-2 left-2 flex gap-2 text-xs text-slate-400">
        <span style={{ color: '#4a9eff' }}>●</span> Expert
        <span style={{ color: '#22c55e' }}>●</span> Company
        <span style={{ color: '#a78bfa' }}>●</span> Industry
        <span style={{ color: '#f59e0b' }}>●</span> Skill
      </div>
    </div>
  );
}
