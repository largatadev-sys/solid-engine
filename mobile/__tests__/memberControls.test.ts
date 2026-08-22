import { memberControls, OWNER_TAG, roleTagFor } from '../src/members/memberControls';
import type { MemberResponse } from '../src/types/api';

const OWNER = 'traveler-owner';
const MEMBER = 'traveler-member';

const row = (travelerId: string, role: string): MemberResponse => ({
  travelerId,
  displayName: travelerId,
  avatarUrl: null,
  role,
  joinedAt: '2026-02-12T00:00:00Z',
});

const ROSTER = [row(OWNER, 'owner'), row(MEMBER, 'member')];

describe('who the viewer is on this roster', () => {
  it('knows the owner', () => {
    expect(memberControls(ROSTER, OWNER).isOwner).toBe(true);
  });

  it('knows a plain member', () => {
    expect(memberControls(ROSTER, MEMBER).isOwner).toBe(false);
  });

  it('treats a stranger and an unknown viewer as not the owner', () => {
    expect(memberControls(ROSTER, 'somebody-else').isOwner).toBe(false);
    expect(memberControls(ROSTER, undefined).isOwner).toBe(false);
  });

  it('survives an empty roster while it is still loading', () => {
    expect(memberControls([], OWNER).isOwner).toBe(false);
  });
});

describe('the role tag', () => {
  it('names only the owner', () => {
    expect(roleTagFor(row(OWNER, 'owner'))).toBe(OWNER_TAG);
    expect(roleTagFor(row(MEMBER, 'member'))).toBeNull();
  });
});
