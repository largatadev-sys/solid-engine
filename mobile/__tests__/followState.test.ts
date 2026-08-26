import {
  followStateFrom,
  reverted,
  settled,
  tapped,
  type FollowState,
} from '../src/profile/followState';

const NOT_FOLLOWING: FollowState = followStateFrom(false, 10);
const FOLLOWING: FollowState = followStateFrom(true, 10);


describe('the follow pill: the screen flips before the server answers', () => {
  it('reads its opening state from what the profile said', () => {
    expect(NOT_FOLLOWING).toEqual({ following: false, followersCount: 10, inFlight: false });
    expect(FOLLOWING).toEqual({ following: true, followersCount: 10, inFlight: false });
  });

  it('flips to Following the moment it is tapped, and moves the count with it', () => {
    const next = tapped(NOT_FOLLOWING);

    expect(next.state.following).toBe(true);
    expect(next.state.followersCount).toBe(11);
    expect(next.intent).toBe('follow');
  });

  it('unfollows on a second tap with no confirmation in between', () => {
    const next = tapped(FOLLOWING);

    expect(next.state.following).toBe(false);
    expect(next.state.followersCount).toBe(9);
    expect(next.intent).toBe('unfollow');
  });

  it('swallows taps while a request is in flight, so a double tap cannot toggle twice', () => {
    const first = tapped(NOT_FOLLOWING);
    const second = tapped(first.state);

    expect(second.intent).toBeNull();
    expect(second.state).toEqual(first.state);
  });

  it('accepts the next tap once the request has settled', () => {
    const flipped = tapped(NOT_FOLLOWING);
    const done = settled(flipped.state);

    expect(done.inFlight).toBe(false);
    expect(tapped(done).intent).toBe('unfollow');
  });

  it('puts the pill back exactly as it was when the request fails', () => {
    tapped(NOT_FOLLOWING);

    expect(reverted(NOT_FOLLOWING)).toEqual(NOT_FOLLOWING);
  });

  it('reverts an unfollow just as faithfully as a follow', () => {
    tapped(FOLLOWING);

    expect(reverted(FOLLOWING)).toEqual(FOLLOWING);
  });

  it('never renders a negative follower count, however the server disagrees', () => {
    const nobodyFollows = followStateFrom(true, 0);

    expect(tapped(nobodyFollows).state.followersCount).toBe(0);
  });
});
