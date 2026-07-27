import type { MemberResponse } from '../types/api';

/**
 * Which departure controls the members screen may show, for one viewer (S1.5).
 *
 * <p><strong>Extracted from the screen because it is the story's only branching logic, and a screen is
 * where this repo cannot test.</strong> `@testing-library/react-native` 14 renders nothing under
 * jest-expo's preset (S0.3, ticket comments), which is why `itineraryQueries` splits its options from
 * its hooks: decisions live in plain functions that a test drives directly, and what is left in the
 * component has nowhere for logic to hide. The same split applies here — otherwise the gating below
 * would be asserted only by a human looking at a screenshot.
 *
 * <p>This is presentation, not enforcement. The server decides every one of these questions again, on
 * the guard's resolved membership; the screen merely declines to advertise dead ends (spec §1). If the
 * two ever disagree, the server is right and the traveler sees an error rather than a silent success.
 */
export type MemberControls = {
  /** Whether the viewer owns this trip — gates the invite field, revoke, and Remove. */
  isOwner: boolean;
  /**
   * Whether to offer "Leave trip". Never for the owner: INV-4 keeps exactly one owner at all times, so
   * their exit only exists after transferring ownership (S1.6). The server answers 409
   * `OWNER_CANNOT_LEAVE` regardless; this is why they are not shown the button in the first place.
   */
  canLeave: boolean;
  /** The travelers this viewer may remove — everyone but themselves, and only if they are the owner. */
  removableTravelerIds: string[];
};

export function memberControls(roster: MemberResponse[], myId: string | undefined): MemberControls {
  // Resolve the viewer from the roster rather than trusting `myId` alone: a traveler who is not on it
  // (a stale screen after being removed, mid-refetch) gets no controls at all, which is the safe
  // default — the alternative offers a Leave button to somebody who has already left.
  const me = myId === undefined ? undefined : roster.find((member) => member.travelerId === myId);
  const isOwner = me?.role === 'owner';
  return {
    isOwner,
    canLeave: me !== undefined && !isOwner,
    removableTravelerIds: isOwner
      ? roster.filter((member) => member.travelerId !== myId).map((member) => member.travelerId)
      : [],
  };
}
