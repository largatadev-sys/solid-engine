import { accountRows, confirmsFlip, flipped } from '../src/profile/accountRows';

describe('the Account screen is rows now, and one of them comes and goes (S4.40 decisions 8 and 9)', () => {
  it('offers a public traveler three rows, in the order the frame draws them', () => {
    expect(accountRows('public')).toEqual(['edit-profile', 'private-profile', 'sign-out']);
  });

  it('adds Follow requests only while the profile is private, between the switch and Sign out', () => {
    expect(accountRows('private')).toEqual([
      'edit-profile',
      'private-profile',
      'follow-requests',
      'sign-out',
    ]);
  });

  it('drops My Trips and Reload, which the founder retired at the canvas', () => {
    for (const visibility of ['public', 'private'] as const) {
      expect(accountRows(visibility)).not.toContain('my-trips');
      expect(accountRows(visibility)).not.toContain('reload');
    }
  });

  it('keeps Sign out last, wherever the requests row lands', () => {
    for (const visibility of ['public', 'private'] as const) {
      const rows = accountRows(visibility);
      expect(rows[rows.length - 1]).toBe('sign-out');
    }
  });
});


describe('the switch asks in one direction only (C3)', () => {
  it('confirms going public, because it approves everyone who asked', () => {
    expect(confirmsFlip('private')).toBe(true);
  });

  it('asks nothing going private — closing a door needs no warning', () => {
    expect(confirmsFlip('public')).toBe(false);
  });

  it('flips to the one alternative, so the switch needs no menu', () => {
    expect(flipped('public')).toBe('private');
    expect(flipped('private')).toBe('public');
  });
});
