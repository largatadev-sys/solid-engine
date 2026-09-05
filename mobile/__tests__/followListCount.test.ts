import { shownFollowCount } from '../src/profile/followListCount';

describe('the count line follows the list it sits above (S4.40 decision 10)', () => {
  it('reads the served count when nothing is leaving', () => {
    expect(shownFollowCount(3, [{ id: 'a' }, { id: 'b' }, { id: 'c' }], [])).toBe(3);
  });

  it('drops by one the moment a row starts leaving, before the server knows', () => {
    expect(shownFollowCount(3, [{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['b'])).toBe(2);
  });

  it('does NOT drop twice once the server stops serving that row', () => {
    expect(shownFollowCount(2, [{ id: 'a' }, { id: 'c' }], ['b'])).toBe(2);
  });

  it('reaches zero on the last follower and stops there, rather than going negative', () => {
    expect(shownFollowCount(1, [{ id: 'a' }], ['a'])).toBe(0);
    expect(shownFollowCount(0, [], ['a'])).toBe(0);
  });

  it('never shows a negative count, however far the server disagrees', () => {
    expect(shownFollowCount(0, [{ id: 'a' }, { id: 'b' }], ['a', 'b'])).toBe(0);
  });

  it('falls back to the rows it can see when no count has arrived', () => {
    expect(shownFollowCount(undefined, [{ id: 'a' }, { id: 'b' }], [])).toBe(2);
    expect(shownFollowCount(undefined, [{ id: 'a' }, { id: 'b' }], ['a'])).toBe(1);
  });

  it('counts several leaving at once', () => {
    expect(shownFollowCount(4, [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], ['a', 'c'])).toBe(2);
  });
});
