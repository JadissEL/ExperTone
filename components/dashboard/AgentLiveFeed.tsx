'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play } from 'lucide-react';
import { useAgentStream } from '@/hooks/useAgentStream';
import { useDashboardStore } from '@/stores/dashboardStore';

export function AgentLiveFeed() {
  const { activeProjectId } = useDashboardStore();
  const { logs, progress, isActive, startStream } = useAgentStream(
    activeProjectId,
    true
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [logs]);

  return (
    <div className="glass-dark rounded-xl p-4 h-full flex flex-col min-h-[280px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-slate-200">Agent Live Feed</span>
        </div>
        <button
          onClick={startStream}
          disabled={isActive}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 text-sm transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          {isActive ? 'Running...' : 'Start'}
        </button>
      </div>

      {isActive && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-slate-400 w-10">{progress}%</span>
        </div>
      )}

      {isActive && (
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-emerald-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs text-emerald-400 font-medium">
            Agent Active
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-900/50 rounded-lg p-3 min-h-[120px]"
      >
        {logs.length === 0 ? (
          <p className="text-slate-500">Click Start to simulate agent activity.</p>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className="py-0.5">
              <span className="text-slate-500">
                [{new Date(entry.timestamp).toLocaleTimeString()}]
              </span>{' '}
              <span className="text-slate-300">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
