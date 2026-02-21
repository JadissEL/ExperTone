/**
 * Vanguard Design System — Tokens & Constants
 * Financial-grade Expert Intelligence Platform
 */

export const COLORS = {
  expertNavy: '#0A192F',
  expertNavyDeep: '#020617',
  expertNavyLight: '#1e293b',
  expertNavyMuted: '#334155',
  wealthEmerald: '#10B981',
  wealthEmeraldMuted: 'rgba(16, 185, 129, 0.2)',
  amberWarn: '#F59E0B',
  amberWarnMuted: 'rgba(245, 158, 11, 0.2)',
  frost: {
    base: 'rgba(255, 255, 255, 0.03)',
    elevated: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
  },
} as const;

export const TYPOGRAPHY = {
  fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
  scale: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '24px',
  },
  lineHeight: {
    dense: 1.2,
    relaxed: 1.4,
  },
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
  },
} as const;

export const SPACING = {
  navCollapsed: 56,
  navExpanded: 220,
  filterBarHeight: 56,
  inspectorWidth: 450,
  inspectorMin: 420,
  inspectorMax: 480,
  gridGap: 8,
  panelPadding: 16,
} as const;

export const Z_INDEX = {
  base: 0,
  float: 10,
  overlay: 20,
  modal: 30,
  toast: 40,
  nav: 50,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 9999,
} as const;

export const GLASS = {
  blur: 24,
  blurDeep: 28,
  saturate: 180,
  borderInner: '1px solid rgba(255, 255, 255, 0.06)',
  borderOuter: '1px solid rgba(255, 255, 255, 0.08)',
  shadowLight: '0 4px 24px -4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.04)',
  shadowFloat: '0 24px 48px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06)',
  grainOpacity: 0.025,
} as const;
