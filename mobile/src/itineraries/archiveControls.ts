import type { ItineraryResponse } from '../types/api';

/**
 * What the archive surface offers on one trip, for one viewer (S1.9).
 *
 * Extracted from the screen for `lifecycleBanner`'s and `memberControls`' reason: this is the story's
 * branching logic, and a screen is where this repo cannot test (`@testing-library/react-native` 14
 * renders nothing under jest-expo's preset — S0.3). Decisions live in a plain function a test drives
 * directly; what is left in the component has nowhere for logic to hide.
 *
 * As with the lifecycle banner, this is presentation, not enforcement: the server asks every one of
 * these questions again on the guard's resolved membership and answers 403 or 409 if the screen was
 * wrong or stale. The screen merely declines to advertise dead ends (the S1.5 rule).
 */

/** What the archive control offers, or `null` for no control at all. */
export type ArchiveControl = {
  /** Which act the button fires — the endpoint segment, so a caller cannot mistype it. */
  act: 'archive' | 'unarchive';
};

/**
 * The archive control for one viewer on one trip, or `null`.
 *
 * **Owner-only, by absence** — the same shape as the lifecycle banner, and the same reason: archive is
 * one of the acts S1.3's ruling reserves to the owner (members shape the plan; the owner keeps
 * lifecycle, membership and existence). A member sees the archived *state* — a workspace-visible fact
 * under INV-1 — and no lever.
 */
export function archiveControl(
  itinerary: Pick<ItineraryResponse, 'archived'>,
  isOwner: boolean,
): ArchiveControl | null {
  if (!isOwner) return null;
  return { act: itinerary.archived ? 'unarchive' : 'archive' };
}

/**
 * Whether the plan's editing affordances should be shown at all (S1.9).
 *
 * **The frozen surface is a hidden lever, not a disabled one that errors.** An archived trip refuses
 * every plan write with `TRIP_ARCHIVED`, so leaving Add/Edit/Delete tappable would offer the traveler
 * a guaranteed failure — the dead end this repo keeps refusing to advertise (S1.5's members screen,
 * S1.7's members-see-no-banner). The archived notice explains why the controls are gone, so their
 * absence reads as a state rather than a bug.
 *
 * Applies to <em>everyone</em>, owner included: archive freezes the trip, not one person's access.
 */
export function canEditPlan(itinerary: Pick<ItineraryResponse, 'archived'>): boolean {
  return !itinerary.archived;
}

/**
 * Whether a member's Leave control stays available on this trip (S1.9).
 *
 * **Always true — and this constant-looking function is the point.** The founder's rule at the
 * grilling: acts on the trip freeze, acts on your own membership do not. A member can leave an
 * archived trip, so hiding Leave alongside the plan's editing controls would strand them on somebody
 * else's decision with no lever of their own and no way to unarchive.
 *
 * It is a named function rather than an inlined `true` because the *decision* is what needs to be
 * findable: the next person to sweep this screen hiding controls on archived trips will find this and
 * its reason, instead of quietly including Leave in the sweep. Its test is the executable version of
 * the same note.
 */
export function canLeaveTrip(_itinerary: Pick<ItineraryResponse, 'archived'>): boolean {
  return true;
}
