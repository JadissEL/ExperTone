'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AgentLogEntry {
  message: string;
  timestamp: string;
  progress: number;
  done?: boolean;
}

export function useAgentStream(projectId: string | null, enabled: boolean) {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(() => {
    if (!enabled) return;
    setLogs([]);
    setProgress(0);
    setIsActive(true);
    setError(null);

    const url = projectId
      ? `/api/agent/stream?projectId=${encodeURIComponent(projectId)}`
      : '/api/agent/stream';
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AgentLogEntry;
        setLogs((prev) => [...prev, data]);
        setProgress(data.progress);
        if (data.done) {
          setIsActive(false);
          eventSource.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setError('Stream connection failed');
      setIsActive(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [projectId, enabled]);

  return { logs, progress, isActive, error, startStream };
}
