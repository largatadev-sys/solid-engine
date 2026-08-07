import { memberControls } from '../src/members/memberControls';
import type { MemberResponse } from '../src/types/api';



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
  avatarUrl: null,
  role,
  joinedAt: '2026-07-27T00:00:00Z',
  ...(ownershipOffered === undefined ? {} : { ownershipOffered }),
});

const ROSTER = [row(OWNER, 'owner'), row(MEMBER, 'member'), row(OTHER, 'member')];


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
    const { isOwner, removableTravelerIds } = memberControls(ROSTER, MEMBER);

    expect(isOwner).toBe(false);
    expect(removableTravelerIds).toEqual([]);
  });
});

describe('a viewer the roster does not list', () => {
  it('gets no controls at all — the safe default for a stale screen after removal', () => {
    expect(memberControls(ROSTER, 'traveler-evicted')).toMatchObject({
      isOwner: false,
      canLeave: false,
      removableTravelerIds: [],
    });
  });

  it('gets no controls before the caller is known', () => {
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
    for (const viewer of [OWNER, MEMBER, OTHER]) {
      expect(memberControls(ROSTER_WITH_OFFER, viewer).offeredTravelerId).toBe(MEMBER);
    }
  });

  it('reads a missing ownershipOffered as no offer — a pre-S1.6 server omits the field (ADR-008)', () => {
    const { offeredTravelerId, isOfferedToMe, canRevokeOffer } = memberControls(ROSTER, MEMBER);

    expect(offeredTravelerId).toBeUndefined();
    expect(isOfferedToMe).toBe(false);
    expect(canRevokeOffer).toBe(false);
  });

  it('gives an evicted viewer no accept control even if the stale roster still offers them the crown', () => {
    const staleRoster = [row(OWNER, 'owner'), row(MEMBER, 'member', true)];

    expect(memberControls(staleRoster, 'traveler-evicted').isOfferedToMe).toBe(false);
  });
});

describe('after a transfer completes', () => {
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

describe('an archived trip (S1.9)', () => {

  it('takes every roster control away from the owner', () => {
    expect(memberControls(ROSTER, OWNER, true)).toMatchObject({
      isOwner: true,
      canInvite: false,
      removableTravelerIds: [],
      offerableTravelerIds: [],
      canRevokeOffer: false,
    });
  });

  it('withdraws a pending offer’s control too — the act is refused while frozen', () => {
    expect(memberControls(ROSTER_WITH_OFFER, OWNER, true).canRevokeOffer).toBe(false);
    expect(memberControls(ROSTER_WITH_OFFER, OWNER, false).canRevokeOffer).toBe(true);
  });

  it('LEAVES Leave alone — the one door archive keeps open', () => {
    expect(memberControls(ROSTER, MEMBER, true).canLeave).toBe(true);
    expect(memberControls(ROSTER, MEMBER, false).canLeave).toBe(true);
  });

  it('still shows the roster and who holds a pending offer — reading is not writing', () => {
    expect(memberControls(ROSTER_WITH_OFFER, OTHER, true).offeredTravelerId).toBe(MEMBER);
  });

  it('defaults to a live trip when the flag is omitted, so pre-S1.9 call sites are unchanged', () => {
    expect(memberControls(ROSTER, OWNER)).toMatchObject(memberControls(ROSTER, OWNER, false));
  });
});
