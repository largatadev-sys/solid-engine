import { shownFollowCount } from '../src/profile/followListCount';

describe('the count line follows the list it sits above (S4.40 decision 10)', () => {
  it('reads the served count when nothing is leaving', () => {
    expect(shownFollowCount(3, ['a', 'b', 'c'], [])).toBe(3);
  });

  it('drops by one the moment a row starts leaving, before the server knows', () => {
    expect(shownFollowCount(3, ['a', 'b', 'c'], ['b'])).toBe(2);
  });

  it('does NOT drop twice once the server stops serving that row', () => {
    expect(shownFollowCount(2, ['a', 'c'], ['b'])).toBe(2);
  });

  it('reaches zero on the last follower and stops there, rather than going negative', () => {
    expect(shownFollowCount(1, ['a'], ['a'])).toBe(0);
    expect(shownFollowCount(0, [], ['a'])).toBe(0);
  });

  it('never shows a negative count, however far the server disagrees', () => {
    expect(shownFollowCount(0, ['a', 'b'], ['a', 'b'])).toBe(0);
  });

  it('falls back to the rows it can see when no count has arrived', () => {
    expect(shownFollowCount(undefined, ['a', 'b'], [])).toBe(2);
    expect(shownFollowCount(undefined, ['a', 'b'], ['a'])).toBe(1);
  });

  it('counts several leaving at once', () => {
    expect(shownFollowCount(4, ['a', 'b', 'c', 'd'], ['a', 'c'])).toBe(2);
  });
});
