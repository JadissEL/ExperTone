'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for Results Table so a single service/load failure does not crash the whole UI.
 */
export class TableErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Results table error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[160px] bg-slate-900/50 rounded-xl text-slate-400 p-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
          <p className="font-medium text-slate-300 text-sm">Results table failed to load</p>
          <p className="text-xs mt-1 text-slate-500">
            Check network or try again. The rest of the dashboard is still available.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
