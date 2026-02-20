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

export class GraphErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Graph error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-slate-900/50 rounded-xl text-slate-400 p-6">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
          <p className="font-medium text-slate-300">Graph failed to load</p>
          <p className="text-sm mt-1 text-slate-500">
            Three.js or WebGL may have crashed. Try refreshing.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
