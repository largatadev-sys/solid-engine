import type { MemberResponse } from '../types/api';

/**
 * Which membership and ownership controls the members screen may show, for one viewer (S1.5; ownership
 * offers added S1.6).
 *
 * <p><strong>Extracted from the screen because it is the story's only branching logic, and a screen is
 * where this repo cannot test.</strong> `@testing-library/react-native` 14 renders nothing under
 * jest-expo's preset (S0.3, ticket comments), which is why `itineraryQueries` splits its options from
 * its hooks: decisions live in plain functions that a test drives directly, and what is left in the
 * component has nowhere for logic to hide. The same split applies here — otherwise the gating below
 * would be asserted only by a human looking at a screenshot.
 *
 * <p>This is presentation, not enforcement. The server decides every one of these questions again, on
 * the guard's resolved membership; the screen merely declines to advertise dead ends (S1.5 spec §1). If
 * the two ever disagree, the server is right and the traveler sees an error rather than a silent success.
 */
export type MemberControls = {
  /** Whether the viewer owns this trip — gates the invite field, revoke, Remove, and offering. */
  isOwner: boolean;
  /**
   * Whether to offer "Leave trip". Never for the owner: INV-4 keeps exactly one owner at all times, so
   * their exit only exists after ownership has been transferred (S1.6). The server answers 409
   * `OWNER_CANNOT_LEAVE` regardless; this is why they are not shown the button in the first place.
   *
   * <p>Note this flips on its own the moment a transfer completes — the ex-owner's next roster read
   * makes them a member, so the control appears with no code doing anything special. That composition
   * is why S1.6 left leaving to S1.5's operation instead of building a combined transfer-and-leave.
   */
  canLeave: boolean;
  /** The travelers this viewer may remove — everyone but themselves, and only if they are the owner. */
  removableTravelerIds: string[];
  /**
   * The traveler currently holding a pending ownership offer, if any. Every member sees this: it is
   * governance state of a shared trip, workspace-walled like roles rather than private between two
   * people, and a group that can see the unaccepted crown can nudge (S1.6 §7).
   */
  offeredTravelerId: string | undefined;
  /**
   * The travelers this viewer may offer ownership to — the owner's non-self rows, and **only while no
   * offer is pending**. At most one offer may stand per trip, so once one does the other rows lose the
   * control rather than showing one that would be refused with `OFFER_ALREADY_PENDING`: at-most-one
   * rendered as absence, the same don't-advertise-dead-ends rule as the owner's missing Leave button.
   */
  offerableTravelerIds: string[];
  /** Whether to show the owner's "Revoke offer" control — only when one is actually pending. */
  canRevokeOffer: boolean;
  /**
   * Whether the viewer is the one being offered the crown, and so should see Accept / Decline (and, on
   * the trip screen, the discovery banner). False for the owner and for uninvolved members.
   */
  isOfferedToMe: boolean;
};

export function memberControls(roster: MemberResponse[], myId: string | undefined): MemberControls {
  // Resolve the viewer from the roster rather than trusting `myId` alone: a traveler who is not on it
  // (a stale screen after being removed, mid-refetch) gets no controls at all, which is the safe
  // default — the alternative offers a Leave button to somebody who has already left.
  const me = myId === undefined ? undefined : roster.find((member) => member.travelerId === myId);
  const isOwner = me?.role === 'owner';
  // `=== true` rather than truthiness: the field is optional on the wire (a pre-S1.6 server omits it),
  // and this is the one place that coerces it so nothing downstream has to think about `undefined`.
  const offered = roster.find((member) => member.ownershipOffered === true);
  const offerPending = offered !== undefined;

  return {
    isOwner,
    canLeave: me !== undefined && !isOwner,
    removableTravelerIds: isOwner
      ? roster.filter((member) => member.travelerId !== myId).map((member) => member.travelerId)
      : [],
    offeredTravelerId: offered?.travelerId,
    offerableTravelerIds:
      isOwner && !offerPending
        ? roster.filter((member) => member.travelerId !== myId).map((member) => member.travelerId)
        : [],
    canRevokeOffer: isOwner && offerPending,
    isOfferedToMe: me !== undefined && offered?.travelerId === myId,
  };
}
