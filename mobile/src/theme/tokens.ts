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
  terracotta016: 'rgba(217, 108, 74, 0.0627451)',
  terracotta000: 'rgba(217, 108, 74, 0)',
  navy140: 'rgba(27, 38, 59, 0.5490196)',
  ink900: '#121212',
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

  accentTint: palette.terracotta016,
  accentTintClear: palette.terracotta000,

  scrim: palette.navy140,

  danger: palette.crimson700,

  success: palette.forest600,

  inputBorder: palette.ink900,
} as const;


const fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  wordmark: 'Outfit_700Bold',
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
  link: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 18, fontWeight: '400' },
  linkStrong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 18, fontWeight: '700' },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, fontWeight: '400' },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.5 },
  codeDigit: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, fontWeight: '700' },
  mono: { fontSize: 13, fontFamily: 'monospace' },

  fine: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, fontWeight: '400' },
  fineMono: { fontSize: 10, fontFamily: 'monospace' },

  fieldLabel: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  input: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 17, fontWeight: '400' },
  fieldAction: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, fontWeight: '700' },
  ctaLabel: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 18, fontWeight: '700' },

  summaryTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 17, fontWeight: '700' },
  summaryMeta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, fontWeight: '400' },
  actionLarge: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  actionMedium: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 18, fontWeight: '600' },
  overviewBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, fontWeight: '400' },

  sheetTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  highlightRow: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  attribution: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, fontWeight: '400' },

  cardDate: { fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  cardSubtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  cardStatus: { fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontWeight: '700' },
} as const;


export const spacing = {
  hair: 2,
  xs: 4,
  xs2: 6,
  sm: 8,
  sm2: 10,
  sm3: 12,
  md: 16,
  md2: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;


export const radii = {
  xs: 2,
  control: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
} as const;


export const controls = {
  inputHeight: 51,
  tripFormControlHeight: 43,
  buttonHeight: 51,
  optionHeight: 72,
  codeBoxHeight: 56,
  bioHeight: 120,
  progressHeight: 4,
  avatarSize: 120,
  verifyIconSize: 128,
  navControl: 40,
} as const;
