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

// There is deliberately no `canLeaveTrip` here (S1.9). One was written — a constant `true` whose job
// was to make the founder's rule findable: acts on the trip freeze, acts on your own membership do
// not. Code review caught that it was imported nowhere, so it could not protect the control it claimed
// to: Leave lives on the members screen, gated by `memberControls`, and a function no call site
// consults defends nothing. The rule now lives where it binds — `memberControls` takes `archived`,
// gates the four roster acts on it, and leaves `canLeave` outside that gate with the reasoning
// attached; a test there pins it. Recorded rather than silently deleted, because "name the decision so
// it is discoverable" was the right instinct applied in the wrong file: an exception has to sit beside
// the rule it is an exception to.
