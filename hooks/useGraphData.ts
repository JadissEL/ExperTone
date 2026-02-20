'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  val: number;
  community?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function useGraphData(limit = 200, refreshKey?: number) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ml/graph/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load graph');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph, refreshKey]);

  return { data, loading, error, refetch: fetchGraph };
}
