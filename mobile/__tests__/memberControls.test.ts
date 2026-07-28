import { memberControls } from '../src/members/memberControls';
import type { MemberResponse } from '../src/types/api';

/**
 * Which membership and ownership controls the members screen offers (S1.5 ticket 02; S1.6 ticket 04).
 *
 * <p>This is the gating that spec §1 calls "don't advertise dead ends", asserted as data. It cannot be
 * tested by rendering the screen — `@testing-library/react-native` 14 renders nothing under jest-expo
 * (S0.3) — which is exactly why the decision was pulled out of the component. The server enforces all
 * of it again; what these tests defend is that a traveler is never shown a button the server will
 * refuse, and never denied one it would allow.
 */

const OWNER = 'traveler-owner';
const MEMBER = 'traveler-member';
const OTHER = 'traveler-other';

const row = (
  travelerId: string,
  role: 'owner' | 'member',
  ownershipOffered?: boolean,
): MemberResponse => ({
  travelerId,
  displayName: travelerId,
  role,
  joinedAt: '2026-07-27T00:00:00Z',
  ...(ownershipOffered === undefined ? {} : { ownershipOffered }),
});

const ROSTER = [row(OWNER, 'owner'), row(MEMBER, 'member'), row(OTHER, 'member')];

/** The same trip, with MEMBER holding a pending ownership offer. */
const ROSTER_WITH_OFFER = [row(OWNER, 'owner'), row(MEMBER, 'member', true), row(OTHER, 'member')];

describe('the owner', () => {
  it('may remove everyone except themselves', () => {
    const { removableTravelerIds } = memberControls(ROSTER, OWNER);

    expect(removableTravelerIds).toEqual([MEMBER, OTHER]);
    expect(removableTravelerIds).not.toContain(OWNER);
  });

  it('is never offered Leave — INV-4 means their exit is a transfer (S1.6), not a departure', () => {
    expect(memberControls(ROSTER, OWNER).canLeave).toBe(false);
  });

  it('is still offered nothing to remove on a trip where they are alone', () => {
    expect(memberControls([row(OWNER, 'owner')], OWNER)).toMatchObject({
      isOwner: true,
      canLeave: false,
      removableTravelerIds: [],
    });
  });
});

describe('a member', () => {
  it('is offered Leave', () => {
    expect(memberControls(ROSTER, MEMBER).canLeave).toBe(true);
  });

  it('may remove nobody — not another member, and not the owner', () => {
    // The server answers 403 for both; the screen must not put the button there to be tapped.
    const { isOwner, removableTravelerIds } = memberControls(ROSTER, MEMBER);

    expect(isOwner).toBe(false);
    expect(removableTravelerIds).toEqual([]);
  });
});

describe('a viewer the roster does not list', () => {
  it('gets no controls at all — the safe default for a stale screen after removal', () => {
    // Reachable: an evicted member's screen still holds the last roster it fetched. Offering them
    // "Leave trip" would be a button whose only possible outcome is an error.
    expect(memberControls(ROSTER, 'traveler-evicted')).toMatchObject({
      isOwner: false,
      canLeave: false,
      removableTravelerIds: [],
    });
  });

  it('gets no controls before the caller is known', () => {
    // useMe resolves asynchronously; until it does, myId is undefined and nothing is offered.
    expect(memberControls(ROSTER, undefined)).toMatchObject({
      isOwner: false,
      canLeave: false,
      removableTravelerIds: [],
    });
  });

  it('gets no controls when the roster has not loaded', () => {
    expect(memberControls([], OWNER)).toMatchObject({ isOwner: false, canLeave: false });
  });
});

describe('offering ownership (S1.6)', () => {
  it('lets the owner offer to everyone but themselves, while no offer stands', () => {
    const { offerableTravelerIds, canRevokeOffer, offeredTravelerId } = memberControls(ROSTER, OWNER);

    expect(offerableTravelerIds).toEqual([MEMBER, OTHER]);
    expect(canRevokeOffer).toBe(false);
    expect(offeredTravelerId).toBeUndefined();
  });

  it('withdraws the offer control from every row once one offer is pending', () => {
    // At-most-one-pending, rendered as absence. The server answers OFFER_ALREADY_PENDING, so a button
    // left on OTHER's row could only ever produce an error.
    const { offerableTravelerIds, canRevokeOffer, offeredTravelerId } = memberControls(
      ROSTER_WITH_OFFER,
      OWNER,
    );

    expect(offerableTravelerIds).toEqual([]);
    expect(canRevokeOffer).toBe(true);
    expect(offeredTravelerId).toBe(MEMBER);
  });

  it('never lets a member offer ownership, offer pending or not', () => {
    expect(memberControls(ROSTER, MEMBER).offerableTravelerIds).toEqual([]);
    expect(memberControls(ROSTER_WITH_OFFER, OTHER).offerableTravelerIds).toEqual([]);
    expect(memberControls(ROSTER_WITH_OFFER, MEMBER).canRevokeOffer).toBe(false);
  });

  it('shows the offeree their own offer, and shows nobody else theirs', () => {
    expect(memberControls(ROSTER_WITH_OFFER, MEMBER).isOfferedToMe).toBe(true);
    expect(memberControls(ROSTER_WITH_OFFER, OTHER).isOfferedToMe).toBe(false);
    expect(memberControls(ROSTER_WITH_OFFER, OWNER).isOfferedToMe).toBe(false);
  });

  it('tells every member who holds the offer — governance state is workspace-walled, not private', () => {
    // All three see the badge; only the target gets Accept/Decline. A group that can see the
    // unaccepted crown can nudge, which is part of the discovery guarantee (spec §7).
    for (const viewer of [OWNER, MEMBER, OTHER]) {
      expect(memberControls(ROSTER_WITH_OFFER, viewer).offeredTravelerId).toBe(MEMBER);
    }
  });

  it('reads a missing ownershipOffered as no offer — a pre-S1.6 server omits the field (ADR-008)', () => {
    // The installed app must tolerate an older server: `undefined` is "no offer", never a crash and
    // never a truthiness accident.
    const { offeredTravelerId, isOfferedToMe, canRevokeOffer } = memberControls(ROSTER, MEMBER);

    expect(offeredTravelerId).toBeUndefined();
    expect(isOfferedToMe).toBe(false);
    expect(canRevokeOffer).toBe(false);
  });

  it('gives an evicted viewer no accept control even if the stale roster still offers them the crown', () => {
    // The offer died with their membership (the server voids it), so a stale screen must not present
    // an Accept button whose only outcome is a 404.
    const staleRoster = [row(OWNER, 'owner'), row(MEMBER, 'member', true)];

    expect(memberControls(staleRoster, 'traveler-evicted').isOfferedToMe).toBe(false);
  });
});

describe('after a transfer completes', () => {
  // The controls flip with no code doing anything special: the next roster read has the roles swapped,
  // and this function is re-evaluated against it. That composition is why S1.6 could leave leaving to
  // S1.5's operation instead of building a combined transfer-and-leave act.
  const AFTER = [row(OWNER, 'member'), row(MEMBER, 'owner'), row(OTHER, 'member')];

  it('gives the former owner a Leave control they never had before', () => {
    expect(memberControls(ROSTER, OWNER).canLeave).toBe(false);
    expect(memberControls(AFTER, OWNER).canLeave).toBe(true);
  });

  it('moves Remove and Make-owner to the new owner', () => {
    expect(memberControls(AFTER, MEMBER)).toMatchObject({
      isOwner: true,
      canLeave: false,
      removableTravelerIds: [OWNER, OTHER],
      offerableTravelerIds: [OWNER, OTHER],
    });
    expect(memberControls(AFTER, OWNER).removableTravelerIds).toEqual([]);
  });
});
