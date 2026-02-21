'use client';

import React, { createContext, useContext } from 'react';
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

const ReducedMotionContext = createContext(false);

export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  const shouldReduce = useFramerReducedMotion() ?? false;
  return (
    <ReducedMotionContext.Provider value={shouldReduce}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion() {
  return useContext(ReducedMotionContext);
}

/** Transition that respects reduced motion */
export function getTransition(reduced: boolean, spring: { type: string; stiffness: number; damping: number; mass: number }) {
  return reduced ? { duration: 0 } : spring;
}
