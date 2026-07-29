


const palette = {
  red600: '#F23643',
  red100: '#F3D2D5',
  slate800: '#2B2F38',
  slate400: '#8A94A6',
  slate100: '#E6E9EF',
  white: '#FFFFFF',
  offWhite: '#F7F8FA',
  green600: '#1B8A5A',
} as const;


export const colors = {

  background: palette.white,

  surface: palette.offWhite,

  border: palette.slate100,

  textPrimary: palette.slate800,

  textSecondary: palette.slate400,

  textOnAccent: palette.white,

  accent: palette.red600,

  accentMuted: palette.red100,

  danger: palette.red600,

  success: palette.green600,
} as const;


export const typography = {
  wordmark: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  bodyStrong: { fontSize: 16, fontWeight: '600' },

  action: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, fontWeight: '400' },
  overline: { fontSize: 11, fontWeight: '600', letterSpacing: 2 },
  mono: { fontSize: 13, fontFamily: 'monospace' },

  fine: { fontSize: 10, fontWeight: '400' },
  fineMono: { fontSize: 10, fontFamily: 'monospace' },
} as const;


export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;


export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
