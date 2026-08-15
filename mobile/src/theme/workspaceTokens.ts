const fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;


export const workspaceColors = {
  accent: '#EA580C',
  accentFocus: '#E8613A',
  accentRing: 'rgba(234, 88, 12, 0.1)',
  onAccent: '#FFFFFF',
  title: '#1C1917',
  muted: '#78716C',
  hairline: '#E7E5E4',
  railBorder: '#ECE8E5',
  inputBorder: '#757575',
  placeholder: '#A59E99',
  sheetBody: '#68615E',
  optionalNote: '#71717A',
  fieldLabel: '#000000',
  secondaryLabel: '#000000',
  surface: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.4)',
  none: 'transparent',
  pressed: '#F5F5F4',
  accentWash: 'rgba(234, 88, 12, 0.06)',
  captured: '#15803D',
} as const;


export const diaryColors = {
  eyebrow: '#EA580C',
  check: '#EA580C',
  sectionLabel: '#1C1917',
  tileWell: '#FAFAF9',
  tileDash: '#D6D3D1',
  posted: '#10B981',
  postedBody: '#6E6A66',
  count: '#78716C',
  addLabel: '#57534E',
  dumpWell: '#FFF7ED',
  dumpBorder: '#FED7AA',
  dumpLabel: '#C2410C',
  badgeInk: 'rgba(28, 25, 23, 0.72)',
  badgeText: '#FFFFFF',
  fieldBorder: '#E7E5E4',
} as const;


export const diaryTypography = {
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  activityTitle: { fontFamily: fonts.extraBold, fontSize: 25, lineHeight: 30, fontWeight: '800' },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  count: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  addTile: { fontFamily: fonts.semiBold, fontSize: 12.5, lineHeight: 16, fontWeight: '600' },
  dumpTile: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, fontWeight: '700' },
  sourceBadge: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  cta: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  link: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  postedTitle: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 39, fontWeight: '700' },
  postedBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, fontWeight: '400' },
} as const;


export const diaryMetrics = {
  tileRadius: 14,
  tileGap: 8,
  checkSize: 20,
  badgeInset: 7,
  ctaHeight: 52,
  ctaRadius: 14,
  captionMinHeight: 80,
  captionPadding: 14,
  postedHalo: 64,
} as const;


export const diaryScreenColors = {
  title: '#1B263B',
  overline: '#5C6470',
  backBorder: '#E2E4E8',
  divider: '#E7E5E4',
  caption: '#1C1917',
  eyebrow: '#EA580C',
  scrim: 'rgba(27, 38, 59, 0.55)',
  card: '#FFFFFF',
  closeInk: 'rgba(28, 25, 23, 0.55)',
  onPhoto: '#FFFFFF',
  dotIdle: 'rgba(255, 255, 255, 0.45)',
  previewCaption: '#44403C',
  previewCount: '#78716C',
  previewTrip: '#A8A29E',
  hint: 'rgba(255, 255, 255, 0.75)',
  photoWell: '#F2F1ED',
  editInk: '#1C1917',
  shareInk: '#EA580C',
} as const;


export const diaryScreenTypography = {
  overline: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  entryTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, fontWeight: '700' },
  caption: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, fontWeight: '400' },
  previewTitle: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 27, fontWeight: '800' },
  previewCaption: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  previewCount: { fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  previewTrip: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  action: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;


export const diaryScreenMetrics = {
  backButton: 36,
  backGlyph: 20,
  streamPhotoHeight: 500,
  entryGap: 24,
  previewCardWidth: 345,
  previewPhotoHeight: 300,
  previewRadius: 20,
  closeButton: 32,
  closeGlyph: 14,
  previewDot: 8,
  previewInset: 12,
  actionGlyph: 15,
} as const;


export const profileColors = {
  avatarWell: '#FDE4CF',
  avatarInk: '#C2410C',
  meta: '#78716C',
  bio: '#44403C',
  cellDivider: '#F5F5F4',
  chevron: '#A8A29E',
  likeHeart: '#EA580C',
  likeCount: '#78716C',
  badgeWell: '#FFEDD5',
  badgeInk: '#C2410C',
  publishedWell: '#DCFCE7',
  publishedInk: '#15803D',
  pricePill: 'rgba(28, 25, 23, 0.75)',
  counterPill: 'rgba(28, 25, 23, 0.72)',
  onPill: '#FFFFFF',
  star: '#F59E0B',
  starMuted: '#D6D3D1',
  dotActive: '#FFFFFF',
  dotIdle: 'rgba(255, 255, 255, 0.5)',
  postcardBorder: '#F5F5F4',
  coverWell: '#E7E5E4',
} as const;


export const profileTypography = {
  displayName: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  initials: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, fontWeight: '400' },
  bio: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 18, fontWeight: '400' },
  statValue: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, fontWeight: '400' },
  editPill: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, fontWeight: '700' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, fontWeight: '700' },
  sectionMeta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, fontWeight: '400' },
  postcardTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, fontWeight: '700' },
  dayBadge: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  caption: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19.6, fontWeight: '400' },
  likes: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  counter: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, fontWeight: '700' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  cardMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, fontWeight: '400' },
  publishedBadge: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pricePill: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  rating: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, fontWeight: '700' },
} as const;


export const profileMetrics = {
  avatarSize: 72,
  cogSize: 38,
  editPillHeight: 40,
  statsRadius: 14,
  sectionRadius: 16,
  sectionThumb: 44,
  sectionThumbRadius: 10,
  postcardRadius: 14,
  postcardPhotoHeight: 400,
  photoPeek: 0,
  cardGap: 14,
  coverHeight: 140,
  chevronSize: 9,
  chevronStroke: 2.5,
  starSize: 13,
  heartSize: 14,
  cogGlyph: 16,
  dotSize: 6,
  pillInset: 10,
} as const;


export const discoveryColors = {
  onCover: '#FFFFFF',
  onCoverMuted: 'rgba(255, 255, 255, 0.85)',
  coverScrim: 'rgba(0, 0, 0, 0.28)',
  bookmarkWell: 'rgba(255, 255, 255, 0.9)',
} as const;


export const coverTints = [
  { base: '#1F6F78', wash: '#57B5B0' },
  { base: '#22335C', wash: '#5B4B8A' },
  { base: '#4E7A3A', wash: '#93B56E' },
  { base: '#22577A', wash: '#63A0BF' },
  { base: '#7A3B2E', wash: '#C9835E' },
  { base: '#4A6B8A', wash: '#8FB3CF' },
] as const;


export const discoveryTypography = {
  railTitle: { fontFamily: fonts.extraBold, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  destinationName: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  searchField: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, fontWeight: '400' },
  sectionEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  applyLabel: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, fontWeight: '700' },
  filterField: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18, fontWeight: '400' },
} as const;


export const discoveryMetrics = {
  sheetMaxWidth: 420,
  trendingCardWidth: 150,
  trendingCardHeight: 190,
  recommendedPeek: 24,
  bookmarkSize: 32,
  bookmarkGlyph: 16,
  bylineAvatar: 22,
  railDotSize: 7,
  grabberWidth: 40,
  grabberHeight: 4,
  grabberRadius: 2,
  badgeSize: 16,
  pillRadius: 999,
  searchBarPadding: 14,
  backButton: 36,
} as const;


export const workspaceBadgeColors = {
  draft: { background: '#FEF3C7', foreground: '#D97706' },
  upcoming: { background: '#DCFCE7', foreground: '#15803D' },
  ongoing: { background: '#E0F2FE', foreground: '#0369A1' },
  completed: { background: '#F3F4F6', foreground: '#6B7280' },
} as const;


export const workspaceTypography = {
  screenTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  badgeLabel: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.5 },
  headerAction: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, fontWeight: '700' },
  provenance: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  tabLabel: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  tabLabelActive: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  dayTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  stubTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  activityName: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  activityTime: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, fontWeight: '400' },
  ctaPrimary: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  ctaSecondary: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  ctaOutlined: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  sheetTitle: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  sheetBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, fontWeight: '400' },
  sheetDismiss: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 20, fontWeight: '600' },
  fieldLabel: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 20, fontWeight: '600' },
  fieldOptional: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18, fontWeight: '400' },
  fieldInput: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 19, fontWeight: '400' },
  detailLabel: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  detailValue: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  memberName: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  memberRole: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, fontWeight: '400' },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;


export const workspaceCardShadow = {
  shadowColor: workspaceColors.title,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 3,
  shadowOpacity: 0.06,
  elevation: 1,
} as const;


export const workspaceRadii = {
  control: 4,
  card: 12,
  sheet: 24,
  pill: 999,
} as const;


export const workspaceMetrics = {
  tabRowHeight: 43,
  tabUnderlineHeight: 3,
  activityRowHeight: 60,
  primaryCtaHeight: 53,
  secondaryCtaHeight: 50,
  sheetCtaHeight: 52,
  inputHeight: 48,
  grabberWidth: 36,
  grabberHeight: 5,
  finalizeRingSize: 72,
  finalizeDiscSize: 56,
  avatarRendered: 96,
  avatarRow: 40,
} as const;
