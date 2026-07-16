/**
 * The design tokens (S0.3, discharging the epic map's "needed before S0.3's first real screens").
 *
 * WHAT IS DECIDED HERE AND WHAT IS NOT
 *
 * Decided, and hard to reverse: that screens consume *semantic roles* rather than values. That is
 * the one-way door — a screen holding `#F23643` welds a colour to a component, and fifty of those
 * make a repaint a migration. A screen holding `colors.accent` does not care what the accent is.
 *
 * NOT decided: the values below. They are the palette borrowed from the existing Largata worklog
 * app — adapted, deliberately interim, and explicitly NOT the brand decision. Whether a portfolio
 * palette suits a *travel* product (trips, diaries, photos, a public browse feed) or reads as an
 * enterprise tool in the wrong clothes is a live question, recorded in the epic map's backlog and
 * DUE BEFORE E4 — the social surface is where strangers first see this product. When it lands, it
 * changes this file and nothing else. That is the whole point of the layer.
 *
 * Roles are named for their JOB, never their appearance: `danger`, not `red`. A role named `red`
 * that turns amber is a lie in every file that reads it.
 */

/**
 * The palette's raw values. Private to this module by convention: screens import `colors`, never
 * these. Two names for one colour is how a "theme" quietly becomes decorative.
 */
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

/** Semantic colour roles — the only colour vocabulary screens are allowed to speak. */
export const colors = {
  /** The app's canvas. */
  background: palette.white,
  /** A raised surface on the canvas: cards, list rows. */
  surface: palette.offWhite,
  /** Hairlines and dividers. */
  border: palette.slate100,
  /** Primary reading text. */
  textPrimary: palette.slate800,
  /** Supporting text: captions, metadata, empty-state prose. */
  textSecondary: palette.slate400,
  /** Text on top of `accent`. */
  textOnAccent: palette.white,
  /** The brand's one emphatic colour: primary actions, the wordmark. */
  accent: palette.red600,
  /** A tinted edge of the accent — borders on accented surfaces. */
  accentMuted: palette.red100,
  /** Something went wrong. Currently the same hue as `accent`; a separate role because they are
   *  separate ideas, and the brand decision may well pull them apart. */
  danger: palette.red600,
  /** Something worked. */
  success: palette.green600,
} as const;

/**
 * The type scale. Sizes are deliberately few — a scale with a value for every wish is not a scale.
 * Weights live with sizes because a heading is a size *and* a weight; splitting them invites screens
 * to invent combinations.
 */
export const typography = {
  wordmark: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  bodyStrong: { fontSize: 16, fontWeight: '600' },
  /** Buttons: one step down from body, because a label is not prose. */
  action: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, fontWeight: '400' },
  overline: { fontSize: 11, fontWeight: '600', letterSpacing: 2 },
  mono: { fontSize: 13, fontFamily: 'monospace' },
  /** Diagnostic strings — ids, traceIds. Small on purpose: present, never competing for attention. */
  fine: { fontSize: 10, fontWeight: '400' },
  fineMono: { fontSize: 10, fontFamily: 'monospace' },
} as const;

/**
 * The spacing rhythm: a 4-point scale. Named by size rather than by use ('md', not 'cardPadding')
 * because the same gap serves many purposes, and use-named spacing multiplies until it is a list of
 * every place in the app.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Corner radii. `pill` is deliberately absurd — it is how RN spells "fully rounded". */
export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
