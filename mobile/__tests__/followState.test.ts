import {
  followStateFrom,
  reverted,
  settled,
  tapped,
  type FollowState,
} from '../src/profile/followState';

const NOT_FOLLOWING: FollowState = followStateFrom('none', 10, 'public');
const FOLLOWING: FollowState = followStateFrom('following', 10, 'public');
const NOT_ASKED: FollowState = followStateFrom('none', 10, 'private');
const REQUESTED: FollowState = followStateFrom('requested', 10, 'private');


describe('the follow pill: the screen flips before the server answers', () => {
  it('reads its opening state from what the profile said', () => {
    expect(NOT_FOLLOWING).toEqual({
      relation: 'none',
      followersCount: 10,
      visibility: 'public',
      inFlight: false,
    });
    expect(FOLLOWING.relation).toBe('following');
  });

  it('flips to Following the moment it is tapped on a public profile, count with it', () => {
    const next = tapped(NOT_FOLLOWING);

    expect(next.state.relation).toBe('following');
    expect(next.state.followersCount).toBe(11);
    expect(next.intent).toBe('follow');
  });

  it('predicts Requested on a private profile, because a request is not an edge', () => {
    const next = tapped(NOT_ASKED);

    expect(next.state.relation).toBe('requested');
    expect(next.intent).toBe('follow');
  });

  it('moves no count on a request — nobody follows anybody yet', () => {
    expect(tapped(NOT_ASKED).state.followersCount).toBe(10);
  });

  it('unfollows on a second tap with no confirmation in between', () => {
    const next = tapped(FOLLOWING);

    expect(next.state.relation).toBe('none');
    expect(next.state.followersCount).toBe(9);
    expect(next.intent).toBe('unfollow');
  });

  it('cancels a request through the same delete, confirm-free, and moves no count', () => {
    const next = tapped(REQUESTED);

    expect(next.state.relation).toBe('none');
    expect(next.state.followersCount).toBe(10);
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
    const done = settled(flipped.state, 'following');

    expect(done.inFlight).toBe(false);
    expect(tapped(done).intent).toBe('unfollow');
  });

  it('takes the server at its word when the prediction was wrong', () => {
    const asked = tapped(NOT_ASKED);

    expect(settled(asked.state, 'following').relation).toBe('following');
  });

  it('moves the count on settling a prediction the server upgraded to an edge', () => {
    const asked = tapped(NOT_ASKED);

    expect(settled(asked.state, 'following').followersCount).toBe(11);
  });

  it('leaves the count alone when the server confirms what the screen predicted', () => {
    const followed = tapped(NOT_FOLLOWING);

    expect(settled(followed.state, 'following').followersCount).toBe(11);
  });

  it('settles a delete to none, whichever of the two it was', () => {
    expect(settled(tapped(FOLLOWING).state, 'none').relation).toBe('none');
    expect(settled(tapped(REQUESTED).state, 'none').relation).toBe('none');
  });

  it('puts the pill back exactly as it was when the request fails', () => {
    tapped(NOT_FOLLOWING);

    expect(reverted(NOT_FOLLOWING)).toEqual(NOT_FOLLOWING);
  });

  it('reverts a cancelled request to Requested, not to Following', () => {
    tapped(REQUESTED);

    expect(reverted(REQUESTED)).toEqual(REQUESTED);
  });

  it('never renders a negative follower count, however the server disagrees', () => {
    const nobodyFollows = followStateFrom('following', 0, 'public');

    expect(tapped(nobodyFollows).state.followersCount).toBe(0);
  });
});
