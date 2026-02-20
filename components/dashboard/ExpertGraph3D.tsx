'use client';

import React, { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useGraphData } from '@/hooks/useGraphData';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { GraphNode, GraphLink } from '@/hooks/useGraphData';

const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d').then((mod) => mod.default),
  { ssr: false }
);

function GraphError({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-xl text-slate-400">
      <p>{error}</p>
    </div>
  );
}

function ExpertGraph3DInner() {
  const expertsVersion = useDashboardStore((s) => s.expertsVersion);
  const { data, loading, error } = useGraphData(200, expertsVersion);
  const { setSelectedExpert } = useDashboardStore();
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const graphData = useMemo(() => {
    if (!data?.nodes?.length) return null;
    const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
    const links = (data.links ?? [])
      .map((l) => {
        const src = typeof l.source === 'string' ? nodesById.get(l.source) : l.source;
        const tgt = typeof l.target === 'string' ? nodesById.get(l.target) : l.target;
        if (!src || !tgt) return null;
        return { ...l, source: src, target: tgt };
      })
      .filter(Boolean) as { source: GraphNode; target: GraphNode; type: string }[];
    return { nodes: data.nodes, links };
  }, [data]);

  const getNodeColor = useCallback((node: { group?: string }) => {
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
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.group === 'expert') {
        setSelectedExpert({
          id: node.id.replace('expert_', ''),
          name: node.label,
          industry: '',
          subIndustry: '',
          country: '',
          region: '',
          seniorityScore: 50,
          yearsExperience: 5,
          predictedRate: 200,
          visibilityStatus: 'GLOBAL_POOL',
        });
      }
    },
    [setSelectedExpert]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-xl">
        <p className="text-slate-400">Loading graph...</p>
      </div>
    );
  }

  if (error) {
    return <GraphError error={error} />;
  }

  if (!graphData?.nodes?.length) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-xl text-slate-400">
        <p>No graph data. Add experts with past_employers and skills.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-slate-950">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(n) => `${(n as GraphNode).label} (${(n as GraphNode).group})`}
        nodeColor={(n) => getNodeColor(n as GraphNode)}
        nodeVal={(n) => ((n as GraphNode).val || 1) * 2}
        linkColor={() => 'rgba(100,100,100,0.4)'}
        linkWidth={1}
        backgroundColor="#0f172a"
        onNodeClick={(n) => handleNodeClick(n as GraphNode)}
        onNodeHover={(n) => {
          setHoveredNode(n as GraphNode);
          setHoverPos(n ? { x: 0, y: 0 } : null);
        }}
      />
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-slate-800/95 backdrop-blur border border-slate-600/50 shadow-lg"
        >
          <p className="font-medium text-slate-200">{hoveredNode.label}</p>
          <p className="text-xs text-slate-400 capitalize">{hoveredNode.group}</p>
        </motion.div>
      )}
      <div className="absolute bottom-4 left-4 right-4 flex gap-2 text-xs text-slate-500">
        <span className="text-blue-400">●</span> Expert
        <span className="text-green-500">●</span> Company
        <span className="text-amber-500">●</span> Skill
      </div>
    </div>
  );
}

export const ExpertGraph3D = React.memo(ExpertGraph3DInner);
