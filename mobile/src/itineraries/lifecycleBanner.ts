import type { ItineraryResponse } from '../types/api';

/**
 * What the owner's lifecycle banner should offer on one trip, right now (S1.7).
 *
 * Extracted from the screen for `memberControls`' reason: this is the story's only branching logic,
 * and a screen is where this repo cannot test (`@testing-library/react-native` 14 renders nothing
 * under jest-expo's preset). Decisions live in a plain function a test drives directly; what is left
 * in the component has nowhere for logic to hide.
 *
 * This is presentation, not enforcement. The server decides every one of these questions again on the
 * guard's resolved membership, and answers 403 or 409 if the screen was wrong or stale. The screen
 * merely declines to advertise dead ends (the S1.5 rule).
 */

/** What the banner shows. `null` means show nothing at all. */
export type LifecycleBanner = {
  /** Which transition the button fires — the endpoint segment, so the caller cannot mistype it. */
  act: 'start' | 'complete';
  /**
   * Whether the trip's own dates say this is overdue. The nudge half of register #10's resolution:
   * dates never *drive* a transition, they only suggest one.
   */
  overdue: boolean;
};

/**
 * The banner for one viewer on one trip, or `null`.
 *
 * **Owner-only, by absence.** A member sees no banner and no lever — lifecycle is the owner's
 * (S1.3's ruling: members shape the plan, the owner keeps lifecycle, membership and existence). They
 * still see the state badge, which is a workspace-visible fact.
 *
 * **An overdue draft offers Start, never Complete** — the strict two-tap path (spec decision 9). The
 * machine has no skip edge, so offering Complete here would produce a 409 the traveler cannot act on.
 * The `overdue` flag on a draft is driven by `startDate`, because the question that banner asks is
 * "has this trip begun?" — even for a trip whose end date has also passed.
 *
 * @param today the device-local calendar date as `YYYY-MM-DD`; the caller supplies it so this stays
 *   pure and testable, and so "today" is the traveler's today rather than the server's
 */
export function lifecycleBanner(
  itinerary: Pick<ItineraryResponse, 'state' | 'startDate' | 'endDate'>,
  isOwner: boolean,
  today: string,
): LifecycleBanner | null {
  if (!isOwner) return null;

  switch (itinerary.state) {
    case 'draft':
      return { act: 'start', overdue: hasPassed(itinerary.startDate, today) };
    case 'active':
      return { act: 'complete', overdue: hasPassed(itinerary.endDate, today) };
    default:
      // `completed`, and any state a future server sends that this build has never heard of (ADR-008
      // — the API type's own note). Silence is the only safe answer for an unknown state: offering a
      // transition out of it would be a guess about a machine this build does not know.
      return null;
  }
}

/**
 * Whether a plan date is in the past. Absent dates never nudge — an undated trip is a legitimate
 * plan (the dreamer's "Japan, someday"), and it must still be startable, just without a suggestion.
 *
 * String comparison, not `Date`: both sides are `YYYY-MM-DD`, which sorts lexicographically exactly
 * as it sorts chronologically. Parsing an ISO date into a `Date` re-introduces the timezone question
 * this format exists to avoid — `new Date('2027-01-10')` is UTC midnight, which is the *previous*
 * day for a traveler in Manila, so a trip would read as overdue a day early.
 */
function hasPassed(date: string | null, today: string): boolean {
  return date !== null && date < today;
}

/**
 * The device's local calendar date as `YYYY-MM-DD` — the value callers pass as `today`.
 *
 * Local, deliberately: a traveler in Manila whose trip starts today should not be told it starts
 * tomorrow because UTC has not caught up. `toISOString()` would do exactly that, which is why this
 * assembles the parts by hand.
 */
export function deviceToday(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
