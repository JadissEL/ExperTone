/**
 * Aether Design System — "Happy Futurism" Fintech
 * Premium, intelligent, fluid, vibrant, high-trust
 */

export const COLORS = {
  // Background Layer (Deep Space)
  base: '#020617',
  baseElevated: '#0f172a',
  indigo: '#3730a3',
  violet: '#4c1d95',

  // Accent System (Energetic Signals)
  actionGreen: '#10b981',
  electricViolet: '#a855f7',
  skyBlue: '#0ea5e9',

  // Typography
  textPrimary: '#ffffff',
  textMuted: '#94a3b8',
  textDim: '#64748b',

  // Glass
  glassBg: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.12)',
} as const;

export const TYPOGRAPHY = {
  fontFamily: 'var(--font-geist-sans), var(--font-inter), Inter, system-ui, sans-serif',
  scale: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '24px',
    '2xl': '30px',
  },
  lineHeight: { dense: 1.2, relaxed: 1.4, loose: 1.6 },
  letterSpacing: { tight: '-0.02em', normal: '0', wide: '0.02em' },
} as const;

export const RADIUS = {
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  pill: '9999px',
} as const;

export const MOTION = {
  spring: { stiffness: 260, damping: 20 },
  springSnappy: { stiffness: 400, damping: 28 },
  springGentle: { stiffness: 200, damping: 25 },
  floatDuration: 6,
  staggerDelay: 0.04,
} as const;

export const GLOW = {
  indigo: '0 0 40px -8px rgba(99, 102, 241, 0.4)',
  violet: '0 0 40px -8px rgba(168, 85, 247, 0.4)',
  emerald: '0 0 32px -6px rgba(16, 185, 129, 0.5)',
  emeraldStrong: '0 0 48px -8px rgba(16, 185, 129, 0.6)',
  sky: '0 0 24px -4px rgba(14, 165, 233, 0.35)',
} as const;
