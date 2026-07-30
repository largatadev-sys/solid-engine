const palette = {
  terracotta600: '#D96C4A',
  terracotta200: '#EFC9BA',
  terracotta050: '#FBF0EB',
  navy800: '#1B263B',
  slate500: '#5C6470',
  mist200: '#E2E4E8',
  linen100: '#F2F1ED',
  cream050: '#FAF9F6',
  white: '#FFFFFF',
  crimson700: '#B3261E',
  forest600: '#2F6B47',
} as const;


export const colors = {

  background: palette.cream050,

  surface: palette.white,

  surfaceMuted: palette.linen100,

  border: palette.mist200,

  textPrimary: palette.navy800,

  textSecondary: palette.slate500,

  textOnAccent: palette.white,

  accent: palette.terracotta600,

  accentMuted: palette.terracotta200,

  accentSoft: palette.terracotta050,

  danger: palette.crimson700,

  success: palette.forest600,
} as const;


const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export const fontAssetNames = Object.values(fonts);


export const typography = {
  wordmark: { fontFamily: fonts.extraBold, fontSize: 42, lineHeight: 51, fontWeight: '800', letterSpacing: -0.5 },
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 19, fontWeight: '400' },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 19, fontWeight: '600' },

  action: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 19, fontWeight: '600' },
  label: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 17, fontWeight: '600' },
  option: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 19, fontWeight: '500' },
  link: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 18, fontWeight: '400' },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, fontWeight: '400' },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.5 },
  code: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, fontWeight: '700' },
  mono: { fontSize: 13, fontFamily: 'monospace' },

  fine: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, fontWeight: '400' },
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
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
} as const;
