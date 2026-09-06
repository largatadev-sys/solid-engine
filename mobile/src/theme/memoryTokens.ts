export const memoryColors = {
  screen: '#FAF9F5',
  card: '#FFFFFF',
  hairline: '#E7E5E4',
  title: '#1C1917',
  body: '#57534E',
  muted: '#78716C',
  faint: '#A19B95',
  accent: '#EA580C',
  accentPressed: '#C2410C',
  accentWash: '#FDE4CF',
  fieldWell: '#F5F5F4',
  tileWell: '#EFEBE4',
  danger: '#B91C1C',
  toastInk: '#FFFFFF',
  toastWell: '#1C1917',
  highlightWash: '#FFF7ED',
  disabledWell: '#E7E5E4',
  disabledInk: '#A8A29E',
} as const;


export const memoryMetrics = {
  screenPadding: 20,
  cardRadius: 14,
  cardPadding: 16,
  fieldRadius: 10,
  fieldHeight: 44,
  tileSize: 72,
  tileRadius: 10,
  tileGap: 8,
  photosPerPostcard: 5,
  coverHeight: 132,
  ctaHeight: 50,
  ctaRadius: 12,
  sheetRadius: 20,
  calendarCell: 40,
  chevron: 20,
  kebab: 24,
  toastRadius: 12,
  sectionGap: 14,
  dayGap: 12,
} as const;


export const memoryMotion = {
  sheetInMs: 260,
  sheetOutMs: 200,
  scrimMs: 200,
  toastInMs: 220,
  toastHoldMs: 2000,
  toastOutMs: 180,
  toastTravel: 12,
  rowExitMs: 200,
  rowReturnMs: 200,
  cardFadeInMs: 200,
  highlightHoldMs: 1000,
} as const;


const fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;


export const memoryTypography = {
  badge: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1 },
  heading: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32 },
  screenTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 17 },
  input: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  tiny: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14 },
  dayHeading: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  monthName: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20 },
  cell: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18 },
  cellSelected: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18 },
  cta: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  chevron: { fontFamily: fonts.regular, fontSize: 20, lineHeight: 24 },
  toast: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 19 },
  statValue: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
} as const;
