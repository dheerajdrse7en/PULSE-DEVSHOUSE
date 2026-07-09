// PULSE Design System
// Aesthetic: Premium dashboard — sleek dark mode, purples, slate grays, clean typography

export const COLORS = {
  // Backgrounds
  bg0: '#000000',          // Deepest background (black)
  bg1: '#09090b',          // Primary background (zinc-950)
  bg2: '#18181b',          // Card background (zinc-900)
  bg3: '#27272a',          // Elevated card (zinc-800)
  border: '#27272a',       // Subtle border (zinc-800)
  borderBright: '#3f3f46', // Active border (zinc-700)

  // Primary branding — Purples and Blues
  primary: '#c084fc',      // purple-400
  primaryDim: '#9333ea',   // purple-600
  primaryFaint: 'rgba(168, 85, 247, 0.1)',

  secondary: '#60a5fa',    // blue-400
  secondaryDim: '#3b82f6', // blue-500
  secondaryFaint: 'rgba(59, 130, 246, 0.1)',

  // Accents & Signals
  green: '#4ade80',        // green-400
  greenDim: '#22c55e',     // green-500
  greenFaint: 'rgba(74, 222, 128, 0.1)',

  amber: '#fbbf24',        // amber-400
  amberDim: '#f59e0b',     // amber-500
  amberFaint: 'rgba(251, 191, 36, 0.1)',

  red: '#f87171',          // red-400
  redDim: '#ef4444',       // red-500
  redFaint: 'rgba(248, 113, 113, 0.1)',

  // IRI condition colors (IRC:SP:20)
  iriGood: '#4ade80',      // Green
  iriFair: '#fbbf24',      // Amber
  iriPoor: '#f97316',      // orange-500
  iriVeryPoor: '#ef4444',  // Red

  // Text
  textPrimary: '#ffffff',  // white
  textSecondary: '#a1a1aa',// zinc-400
  textMuted: '#71717a',    // zinc-500
  textPurple: '#c084fc',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
};

export const FONTS = {
  // Display: For data values, we can just use system fonts matching tabular numbers
  mono: 'System',
  // Body: clean technical
  regular: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
};

export const IRI_THRESHOLDS = {
  GOOD: 2.0,
  FAIR: 4.0,
  POOR: 6.0,
};

export const getIRIColor = (iri) => {
  if (iri === null || iri === undefined) return COLORS.textMuted;
  if (iri < IRI_THRESHOLDS.GOOD) return COLORS.iriGood;
  if (iri < IRI_THRESHOLDS.FAIR) return COLORS.iriFair;
  if (iri < IRI_THRESHOLDS.POOR) return COLORS.iriPoor;
  return COLORS.iriVeryPoor;
};

export const getIRILabel = (iri) => {
  if (iri === null || iri === undefined) return 'NO DATA';
  if (iri < IRI_THRESHOLDS.GOOD) return 'GOOD';
  if (iri < IRI_THRESHOLDS.FAIR) return 'FAIR';
  if (iri < IRI_THRESHOLDS.POOR) return 'POOR';
  return 'VERY POOR';
};

export const getIRIAction = (iri) => {
  if (iri === null || iri === undefined) return '—';
  if (iri < IRI_THRESHOLDS.GOOD) return 'ROUTINE MAINT.';
  if (iri < IRI_THRESHOLDS.FAIR) return 'PREVENTIVE TX';
  if (iri < IRI_THRESHOLDS.POOR) return 'REHABILITATION';
  return 'RECONSTRUCTION';
};

export const formatIRI = (iri) => {
  if (iri === null || iri === undefined) return '—';
  return iri.toFixed(1);
};