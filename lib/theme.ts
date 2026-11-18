import { useWindowDimensions } from 'react-native';

/**
 * CivicHelper design tokens — one consistent system for the whole app.
 *
 * Identity: a paper trail. Stamp red (#C0392B) is the one disciplined
 * theme color, postmark blue (#33587A) is the accent, on warm paper
 * surfaces (#FAF6EE) over a soft cream/red aurora. Archivo (bold
 * grotesque) is the display face — deliberately different from
 * FridgeToMeal/MediGuide's Sora, SplitEase's Fraunces and PlantDoctor's
 * Bricolage Grotesque. Urgency reads red (due soon) / amber (soon) /
 * gray (no deadline); done steps read deep green.
 */

export const palette = {
  // Brand — one disciplined stamp red.
  primary: '#C0392B',
  primaryDeep: '#8E281D',
  primaryLight: '#D96A5A',
  primarySoft: '#F6DCD6',
  primaryPale: '#FDF0EC',
  // Postmark blue accent.
  accent: '#33587A',
  accentLight: '#5B7FA3',
  accentSoft: '#DCE7F0',
  // Neutrals (warm-paper tinted so the whole UI feels one family).
  ink: '#26221C',
  body: '#4A443A',
  muted: '#8A8172',
  line: 'rgba(38, 34, 28, 0.10)',
  surface: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.62)',
  glassStrong: 'rgba(255, 255, 255, 0.80)',
  sheet: 'rgba(255, 255, 255, 0.88)',
  // Aurora background stops — warm paper.
  aurora: ['#FAF6EE', '#FDF0EC', '#F1E9DC'] as const,
  // Urgency semantics.
  urgent: '#C0392B',
  urgentSoft: '#F6DCD6',
  soon: '#B97F1F',
  soonSoft: '#FBF3DC',
  none: '#8A8172',
  noneSoft: '#EDE8DE',
  // Status.
  warning: '#B97F1F',
  warningSoft: '#FBF3DC',
  error: '#B3261E',
  errorSoft: '#FCE8E6',
  success: '#1E7A4C',
  successSoft: '#DDF0E4',
} as const;

/** Sender-seal circle colors (cycled by letter index). */
export const sealColors = [
  '#C0392B',
  '#33587A',
  '#1E7A4C',
  '#B97F1F',
  '#6D4C9E',
  '#0E7C7B',
  '#B23A48',
  '#3E6B8E',
] as const;

/** Backwards-compatible alias used by shared UI components. */
export const memberColors = sealColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  card: 30,
  sheet: 38,
  pill: 999,
  input: 24,
} as const;

/**
 * Display typeface — Archivo (bundled via @expo-google-fonts/archivo,
 * loaded in app/_layout.tsx). Used for headlines, screen titles and big
 * numbers; body text stays on the system font.
 */
export const font = {
  display: 'Archivo_800ExtraBold',
  bold: 'Archivo_700Bold',
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 42, lineHeight: 46, letterSpacing: -0.5 },
  displayWide: { fontFamily: font.display, fontSize: 56, lineHeight: 60, letterSpacing: -0.5 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  subtitle: { fontFamily: font.bold, fontSize: 17, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.6 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.1 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#26221C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: {
    shadowColor: '#C0392B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  blueGlow: {
    shadowColor: '#33587A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  float: {
    shadowColor: '#26221C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export type Breakpoint = 'compact' | 'medium' | 'wide' | 'desktop';

export interface Responsive {
  breakpoint: Breakpoint;
  width: number;
  /** Max width for the centered content column. */
  contentMaxWidth: number;
  /** Horizontal page padding. */
  pad: number;
  /** Columns for card grids. */
  columns: number;
  /** Two-pane list + detail layout (foldable unfolded / tablet / desktop). */
  twoPane: boolean;
  display: typeof type.display | typeof type.displayWide;
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  if (width < 600) {
    return {
      breakpoint: 'compact',
      width,
      contentMaxWidth: width,
      pad: 20,
      columns: 1,
      twoPane: false,
      display: type.display,
    };
  }
  if (width < 840) {
    return {
      breakpoint: 'medium',
      width,
      contentMaxWidth: 640,
      pad: 28,
      columns: 1,
      twoPane: false,
      display: type.displayWide,
    };
  }
  if (width < 1280) {
    return {
      breakpoint: 'wide',
      width,
      contentMaxWidth: 1024,
      pad: 32,
      columns: 2,
      twoPane: true,
      display: type.displayWide,
    };
  }
  return {
    breakpoint: 'desktop',
    width,
    contentMaxWidth: 1120,
    pad: 40,
    columns: 3,
    twoPane: true,
    display: type.displayWide,
  };
}
