import { inProfileStack, tabJump } from '../src/navigation/tabJump';


describe('a tab press dismisses only within its own stack, and navigates across (S4.13)', () => {
  it('dismisses when the target is behind the traveler in this very stack', () => {
    expect(tabJump(true, true)).toBe('dismissTo');
  });

  it('navigates when the target lives in another stack, however deep this one is', () => {
    expect(tabJump(true, false)).toBe('navigate');
  });

  it('navigates from a stack root, where there is nothing to dismiss', () => {
    expect(tabJump(false, true)).toBe('navigate');
    expect(tabJump(false, false)).toBe('navigate');
  });
});


describe('which stack a route belongs to — the profile group owns five route families', () => {
  it.each([
    '/profile',
    '/account',
    '/follow-requests',
    '/diary/abc',
    '/diary/abc/def',
    '/showcase/abc',
  ])(
    '%s is in the profile stack',
    (pathname) => {
      expect(inProfileStack(pathname)).toBe(true);
    },
  );

  it.each(['/', '/itineraries/abc', '/itineraries/abc/diary', '/published/abc', '/members/abc'])(
    '%s is not',
    (pathname) => {
      expect(inProfileStack(pathname)).toBe(false);
    },
  );

  it('matches on a whole segment, so a lookalike prefix is not swallowed', () => {
    expect(inProfileStack('/profiles-of-others')).toBe(false);
    expect(inProfileStack('/diaryish')).toBe(false);
  });
});
