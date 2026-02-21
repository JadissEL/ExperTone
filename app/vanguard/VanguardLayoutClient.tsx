'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { VanguardLayout } from '@/components/vanguard/VanguardLayout';
import { ReducedMotionProvider } from '@/lib/vanguard/reduced-motion';
import { useVanguardStore } from '@/stores/vanguardStore';

export function VanguardLayoutClient({ children }: { children: React.ReactNode }) {
  const activeExpert = useVanguardStore((s) => s.activeExpert);

  return (
    <ReducedMotionProvider>
    <div className="relative h-screen overflow-hidden">
      <VanguardLayout mainContent={children} />
      <div
        className={`absolute z-toast transition-all duration-200 ${
          activeExpert ? 'top-4 right-4 sm:right-[478px]' : 'top-4 right-4'
        }`}
      >
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
    </ReducedMotionProvider>
  );
}
