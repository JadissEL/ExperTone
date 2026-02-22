/**
 * Vanguard Motion Engine — Framer Motion Spring Physics
 * Never use linear easing. Everything tactile.
 */

export const SPRING = {
  default: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 28,
    mass: 0.6,
  },
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
    mass: 1,
  },
  /** Aether: Apex Hunter staggered intelligence reveal */
  apex: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 20,
    mass: 0.8,
  },
} as const;

export const STAGGER = {
  gridDelay: 0.05,
  apexDelay: 0.04,
  gridInitial: { opacity: 0, y: 6 },
  gridAnimate: { opacity: 1, y: 0 },
} as const;

/** Aether: Floating breath-like animation (Concierge Brief) */
export const FLOAT = {
  y: [0, -10, 0] as [number, number, number],
  duration: 6,
  ease: 'easeInOut' as const,
} as const;

export const MICRO = {
  badgeHoverScale: 1.02,
  lockRotation: 12,
  buttonPressScale: 0.97,
} as const;

export const PULSE = {
  opacityRange: [0.97, 1.03] as [number, number],
  duration: 2.5,
} as const;
