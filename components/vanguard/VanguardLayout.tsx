'use client';

import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { NavSpine } from './NavSpine';
import { SearchFilterNexus } from './SearchFilterNexus';
import { DataEngine } from './DataEngine';
import { useVanguardScrapeActive } from '@/stores/vanguardStore';

import { PULSE } from '@/lib/vanguard/motion';

const InspectorPanel = lazy(() => import('./InspectorPanel').then((m) => ({ default: m.InspectorPanel })));

interface VanguardLayoutProps {
  children?: React.ReactNode;
  /** Optional: render custom main content instead of DataEngine */
  mainContent?: React.ReactNode;
}

export function VanguardLayout({ children, mainContent }: VanguardLayoutProps) {
  const scrapeActive = useVanguardScrapeActive();

  return (
    <div className="flex h-screen overflow-hidden bg-aether-base mesh-bg vanguard-grain relative">
      <a
        href="#vanguard-main"
        className="fixed -translate-y-full left-4 top-4 z-[100] px-4 py-2 rounded-md bg-expert-emerald text-expert-navy font-medium outline-none transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-expert-emerald/50 focus:ring-offset-2 focus:ring-offset-expert-navy"
      >
        Skip to main content
      </a>
      {scrapeActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-float"
          animate={{ opacity: PULSE.opacityRange }}
          transition={{ duration: PULSE.duration, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.04), transparent 70%)',
            willChange: 'opacity',
          }}
          aria-hidden
        />
      )}
      {/* 1. Left: Adaptive Navigation Spine */}
      <NavSpine />

      {/* 2–4. Top + Main + Right */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 2. Top: Search–Filter Nexus */}
        <SearchFilterNexus />

        {/* 3. Main: Data Engine */}
        <main id="vanguard-main" className="flex-1 min-h-0 overflow-hidden p-4" tabIndex={-1}>
          {mainContent ?? <DataEngine />}
        </main>
      </div>

      {/* 4. Right: Inspector Panel (overlay) — code-split */}
      <Suspense fallback={null}>
        <InspectorPanel />
      </Suspense>
    </div>
  );
}
