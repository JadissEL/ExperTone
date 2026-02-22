'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d').then((mod) => mod.default),
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
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function KnowledgeGraphClient() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/ml/graph/visualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 200 }),
      credentials: 'include',
      signal: ac.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((d) => {
        if (!ac.signal.aborted) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ac.signal.aborted && e?.name !== 'AbortError') {
          setError(e.message || 'Failed to load graph');
          setData(null);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Loading knowledge graph...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#c00' }}>
        <strong>Error:</strong> {error}
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Ensure the ML service is running: <code>npm run ml:start</code>
        </p>
      </div>
    );
  }

  if (!data || (!data.nodes?.length && !data.links?.length)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        No graph data. Add experts with past_employers and skills to see the knowledge graph.
      </div>
    );
  }

  // Transform for react-force-graph: links need source/target as node objects
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const links = data.links
    .map((l) => {
      const src = typeof l.source === 'string' ? nodesById.get(l.source) : l.source;
      const tgt = typeof l.target === 'string' ? nodesById.get(l.target) : l.target;
      if (!src || !tgt) return null;
      return { ...l, source: src, target: tgt };
    })
    .filter(Boolean) as { source: GraphNode; target: GraphNode; type: string }[];

  const graphData = { nodes: data.nodes, links };

  const getNodeColor = (node: { group?: string }) => {
    switch (node.group) {
      case 'expert':
        return '#4a9eff';
      case 'company':
        return '#22c55e';
      case 'skill':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  };

  return (
    <div style={{ width: '100%', height: '70vh', minHeight: 400, position: 'relative' }}>
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(n) => `${(n as GraphNode).label} (${(n as GraphNode).group})`}
        nodeColor={(n) => getNodeColor(n as GraphNode)}
        nodeVal={(n) => ((n as GraphNode).val || 1) * 2}
        linkColor={() => 'rgba(100,100,100,0.4)'}
        linkWidth={1}
        backgroundColor="#0f172a"
      />
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          background: 'rgba(15,23,42,0.9)',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        <span style={{ color: '#4a9eff' }}>●</span> Expert &nbsp;
        <span style={{ color: '#22c55e' }}>●</span> Company &nbsp;
        <span style={{ color: '#f59e0b' }}>●</span> Skill
      </div>
    </div>
  );
}
