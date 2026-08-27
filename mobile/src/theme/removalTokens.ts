const fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;


export const removalColors = {
  cautionary: '#B45309',

  panelDelete: '#B3261E',
  panelLeave: '#5C6470',
  onPanel: '#FFFFFF',

  profileToastWell: 'rgba(28, 25, 23, 0.92)',
  profileToastAccent: '#FDBA74',
  tripsToastWell: '#1C1917',
  tripsToastAccent: '#EFC9BA',
  toastInk: '#FFFFFF',
  toastDivider: 'rgba(255, 255, 255, 0.2)',

  modalScrim: 'rgba(27, 38, 59, 0.549)',
  modalSurface: '#FFFFFF',
  modalTitle: '#1B263B',
  modalBody: '#5C6470',
  modalEmphasis: '#1B263B',
  ackWell: '#FAF9F6',
  ackBorder: '#E2E4E8',
  ackBoxBorder: '#B3261E',
  ackFill: '#B91C1C',
  ackTick: '#FFFFFF',
  ackLabel: '#1B263B',
  ctaIdleWell: '#F5F5F4',
  ctaIdleInk: '#A8A29E',
  ctaArmedWell: '#B91C1C',
  ctaArmedInk: '#FFFFFF',
  cancelInk: '#5C6470',
} as const;


export const removalTypography = {
  toast: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  profileUndo: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, fontWeight: '700' },
  tripsUndo: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  panelLabel: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  modalTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  modalBody: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, fontWeight: '400' },
  ackLabel: { fontFamily: fonts.semiBold, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  cta: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  cancel: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
} as const;


export const removalMetrics = {
  toastRadiusProfile: 14,
  toastPaddingV: 10,
  toastPaddingH: 18,
  toastActionPaddingV: 11,
  toastActionPaddingLeft: 16,
  toastActionPaddingRight: 6,
  toastDividerHeight: 20,
  toastDividerHeightTrips: 18,
  undoTarget: 44,
  undoPaddingH: 16,
  drainHeight: 2,

  profileToastInset: 20,
  profileToastBottom: 104,
  tripsToastInset: 32,
  tripsToastBottom: 116,
  tripsToastBottomLifted: 191,

  panelWidth: 96,
  panelGlyph: 20,
  panelGap: 5,

  modalRadius: 14,
  modalPaddingH: 20,
  modalPaddingTop: 20,
  modalPaddingBottom: 12,
  modalInset: 24,
  ackRadius: 8,
  ackPadding: 12,
  ackGap: 10,
  ackBox: 20,
  ackBoxRadius: 4,
  ackBoxBorder: 2,
  ackTickGlyph: 12,
  ctaHeight: 51,
  ctaRadius: 4,
  cancelHeight: 44,
} as const;


export const removalMotion = {
  toastInMs: 180,
  toastOutMs: 180,

  collapseMs: 280,
  restoreMs: 260,

  drainFloorMs: 90,

  panelBeatMs: 120,

  snapMs: 220,
  revealPx: 96,
  overdragPx: 12,
  engagePx: 4,

  peekPx: -14,
  peekOutAtMs: 760,
  peekBackAtMs: 1660,

  modalInMs: 200,
  modalFromScale: 0.96,
  ackTickMs: 140,
  ctaSwapMs: 160,

  entryStaggerMs: 40,
} as const;
