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
  sheetScrim: 'rgba(27, 38, 59, 0.55)',
  drawerHandle: '#E2E4E8',
  drawerTitle: '#1B263B',
  drawerBody: '#5C6470',
  drawerAccent: '#D96C4A',
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
  lifecycle: { background: '#FBF0EB', foreground: '#B14E2E', border: '#EFC9BA' },
} as const;


export const pollTypography = {
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  question: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  optionLabel: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  count: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, fontWeight: '400' },
  tag: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, fontWeight: '700', letterSpacing: 0.4 },
  progressLabel: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  dialogTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  dialogBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, fontWeight: '400' },
  initials: { fontFamily: fonts.bold, fontSize: 8, lineHeight: 10, fontWeight: '700' },
} as const;


export const pollMetrics = {
  cardRadius: 16,
  optionRadius: 12,
  avatarSize: 16,
  avatarOverlap: -6,
  progressHeight: 6,
  submitHeight: 53,
  badgeRadius: 999,
  emptyGlyphWell: 64,
} as const;


export const pollMotion = {
  rowSelectMs: 150,
  markerPopMs: 200,
  progressMs: 300,
  swapMs: 200,
  scrimMs: 150,
  dialogPopMs: 200,
  rowGrowthMs: 200,
  swapRisePx: 6,
  markerFromScale: 0.5,
} as const;

export const pollColors = {
  selectedFill: '#FFEDD5',
  recordedFill: '#FFF7ED',
  winnerPaper: '#FAF9F6',
  danger: '#B91C1C',
  demoted: '#78716C',
  ink: '#44403C',
  footerHairline: '#F5F5F4',
  openBadgeFill: '#FEF3C7',
  openBadgeInk: '#D97706',
  closedBadgeFill: '#F3F4F6',
  closedBadgeInk: '#6B7280',
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
  drawerTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  drawerBody: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 21, fontWeight: '400' },
  drawerCta: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  drawerCancel: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 19, fontWeight: '600' },
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
  drawer: 20,
  pill: 999,
} as const;


export const workspaceMetrics = {
  tabRowHeight: 43,
  tabUnderlineHeight: 3,
  activityRowHeight: 60,
  primaryCtaHeight: 53,
  secondaryCtaHeight: 50,
  sheetCtaHeight: 52,
  drawerCtaHeight: 51,
  inputHeight: 48,
  grabberWidth: 36,
  grabberHeight: 5,
  finalizeRingSize: 72,
  finalizeDiscSize: 56,
  avatarRendered: 96,
  avatarRow: 40,
} as const;


export const tripTabColors = {
  labelIdle: '#5C6470',
  labelActive: '#1B263B',
  underline: '#D96C4A',
  hairline: '#E2E4E8',
  advisoryDot: '#D97706',
  advisoryText: '#B45309',
  archivedLink: '#5C6470',
} as const;


export const tripTabTypography = {
  label: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18, fontWeight: '400' },
  labelActive: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  empty: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, fontWeight: '400' },
  archivedLink: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const;


export const tripTabMetrics = {
  rowHeight: 44,
  underlineHeight: 3,
  planCtaHeight: 51,
} as const;


export const sheetMotion = {
  scrimInMs: 200,
  travelInMs: 300,
  travelOutMs: 200,
  scrimOutMs: 150,
  inFlightOpacity: 0.85,
} as const;


export const travelerMotion = {
  scrimInMs: 150,
  scrimOutMs: 150,
  sheetInMs: 200,
  sheetOutMs: 150,
  sheetTravelPx: 420,

  rowEntranceMs: 150,
  rowRisePx: 8,
  cascadeStepMs: 30,
  cascadeCap: 10,
  addBarInMs: 200,
  addBarDelayMs: 240,

  layoutMs: 200,
  crossfadeMs: 150,
  popMs: 200,
  popStaggerMs: 40,

  postcardInMs: 200,
  postcardRisePx: 8,
} as const;


export const travelerColors = {
  accent: '#EA580C',
  accentDark: '#C2410C',
  ink: '#1C1917',
  muted: '#78716C',
  iconMuted: '#A59E99',
  hairline: '#E7E5E4',
  divider: '#F5F5F4',
  wellNeutral: '#FAFAF9',
  wellWarm: '#FFF7ED',
  accentBorder: '#FED7AA',
  destructive: '#B91C1C',
  surface: '#FFFFFF',
  onAccent: '#FFFFFF',
  scrim: 'rgba(28,25,23,0.4)',
  coverWell: '#FFEDD5',
  invitedOpacity: 0.55,
} as const;


export const travelerTypography = {
  sectionHeading: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2 },
  rowTitle: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  rowYou: { fontSize: 14, lineHeight: 18, fontWeight: '400' },
  rowSub: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  rowAction: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  sheetTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  menuEntry: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  addBarLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  invitePill: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  ghostPill: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  foundName: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  emptyTitle: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  emptyBody: { fontSize: 12.5, lineHeight: 17, fontWeight: '400' },
  linkLabel: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  linkSub: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  offerTitle: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  offerAccept: { fontSize: 12.5, lineHeight: 16, fontWeight: '700' },
  offerDecline: { fontSize: 12.5, lineHeight: 16, fontWeight: '600' },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  cardMeta: { fontSize: 12.5, lineHeight: 16, fontWeight: '400' },
  cardGoing: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  cardExpiry: { fontSize: 11.5, lineHeight: 15, fontWeight: '400' },
  postcardKicker: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.4 },
  postcardTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  postcardMeta: { fontSize: 13, lineHeight: 17, fontWeight: '400' },
  postcardCta: { fontSize: 14.5, lineHeight: 19, fontWeight: '700' },
  postcardQuiet: { fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
  wordmark: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
} as const;


export const travelerMetrics = {
  avatar: 40,
  avatarHit: 44,
  facepileAvatar: 26,
  facepileOverlap: -8,
  facepileRing: 2,
  rowPaddingV: 10,
  rowPaddingH: 16,
  rowGap: 12,
  sectionHeaderTop: 16,
  sectionHeaderBottom: 6,
  addBarPaddingV: 12,
  addBarPaddingH: 16,
  addBarCtaPadding: 13,
  grabberWidth: 36,
  grabberHeight: 4,
  menuEntryPaddingV: 14,
  menuEntryPaddingH: 20,
  menuIcon: 19,
  inboxCover: 120,
  postcardCover: 136,
  offerIcon: 16,
} as const;


export const travelerAvatarTints = [
  { well: '#DBEAFE', ink: '#1D4ED8' },
  { well: '#FDE4CF', ink: '#C2410C' },
  { well: '#DCFCE7', ink: '#15803D' },
  { well: '#FEF9C3', ink: '#A16207' },
  { well: '#EDE9FE', ink: '#6D28D9' },
  { well: '#FCE7F3', ink: '#BE185D' },
  { well: '#CFFAFE', ink: '#0E7490' },
  { well: '#FEE2E2', ink: '#B91C1C' },
] as const;


export const travelerRadii = {
  card: 12,
  inviteCard: 16,
  sheet: 20,
  postcard: 18,
  pill: 100,
} as const;


export const tripTabMotion = {
  underlineMs: 200,
  labelColorMs: 150,
  listRiseMs: 150,
  listRisePx: 8,
  badgeCrossfadeMs: 150,
  pressInMs: 100,
  pressOutMs: 150,
  pressedOpacity: 0.85,
} as const;


export const chatColors = {
  bubbleOther: '#FAFAF9',
  bubbleOtherBorder: '#E7E5E4',
  bubbleMine: '#FFF7ED',
  bubbleMineBorder: '#FED7AA',
  bubbleInk: '#1C1917',
  handle: '#78716C',
  stamp: '#A59E99',
  hairline: '#E7E5E4',
  field: '#FAFAF9',
  fieldBorder: '#E7E5E4',
  placeholder: '#A59E99',
  sendIdle: '#F5F5F4',
  sendIdleGlyph: '#A59E99',
  sendReady: '#EA580C',
  sendReadyGlyph: '#FFFFFF',
  sendPressed: '#E8613A',
  counter: '#A59E99',
  counterAtCap: '#C2410C',
  failure: '#B91C1C',
  retry: '#EA580C',
  discard: '#78716C',
  emptyWell: '#FAF9F6',
  emptyGlyph: '#78716C',
  emptyBody: '#78716C',
  noticeWell: '#FAFAF9',
  noticeInk: '#78716C',
  pillSurface: '#FFFFFF',
  pillInk: '#EA580C',
} as const;


export const chatAvatarTints = [
  { well: '#FDE4CF', ink: '#C2410C' },
  { well: '#DBEAFE', ink: '#1D4ED8' },
  { well: '#DCFCE7', ink: '#15803D' },
  { well: '#FEF3C7', ink: '#B45309' },
  { well: '#EDE9FE', ink: '#6D28D9' },
  { well: '#FCE7F3', ink: '#BE185D' },
] as const;


export const chatMetrics = {
  avatarSize: 28,
  bubbleMaxWidth: 256,
  bubbleRadius: 18,
  bubbleSenderCorner: 6,
  bubblePaddingVertical: 9,
  bubblePaddingHorizontal: 13,
  intraGroupGap: 2,
  interGroupGap: 14,
  avatarGap: 8,
  fieldRadius: 20,
  fieldMinHeight: 40,
  fieldLineHeight: 19,
  fieldMaxLines: 3,
  fieldPaddingVertical: 10,
  fieldPaddingHorizontal: 16,
  sendButtonSize: 36,
  sendGlyphSize: 16,
  emptyWellSize: 64,
  emptyGlyphSize: 28,
  hitSlop: 12,
  threadPaddingHorizontal: 14,
  threadPaddingTop: 16,
  threadPaddingBottom: 10,
  composerPaddingVertical: 10,
  composerPaddingHorizontal: 14,
  failedOpacity: 0.55,
} as const;


export const chatTypography = {
  body: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  handle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  stamp: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  initials: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
  counter: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  failure: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  action: { fontSize: 12, lineHeight: 15, fontWeight: '600' },
  emptyBody: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  notice: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;


export const chatMotion = {
  entranceMs: 250,
  entranceRisePx: 8,
  stateChangeMs: 150,
  layoutMs: 200,
  pressInMs: 100,
  pressOutMs: 150,
  pressedOpacity: 0.85,
} as const;


export const chatCopy = {
  placeholder: 'Message…',
  empty: 'Say hello — the plan starts here.',
  archived: 'This trip is archived — chat is closed.',
  failed: "Couldn't send",
  retry: 'Retry',
  discard: 'Discard',
  newMessages: '↓ New messages',
} as const;
