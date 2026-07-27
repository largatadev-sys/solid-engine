import { memberControls } from '../src/members/memberControls';
import type { MemberResponse } from '../src/types/api';

/**
 * Which departure controls the members screen offers (S1.5, ticket 02).
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

const row = (travelerId: string, role: 'owner' | 'member'): MemberResponse => ({
  travelerId,
  displayName: travelerId,
  role,
  joinedAt: '2026-07-27T00:00:00Z',
});

const ROSTER = [row(OWNER, 'owner'), row(MEMBER, 'member'), row(OTHER, 'member')];

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
