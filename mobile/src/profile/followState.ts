export interface FollowState {
  readonly following: boolean;
  readonly followersCount: number;
  readonly inFlight: boolean;
}

export type FollowIntent = 'follow' | 'unfollow';

export interface FollowTap {
  readonly state: FollowState;
  readonly intent: FollowIntent | null;
}


export function followStateFrom(following: boolean, followersCount: number): FollowState {
  return { following, followersCount, inFlight: false };
}


export function tapped(state: FollowState): FollowTap {
  if (state.inFlight) {
    return { state, intent: null };
  }
  return {
    state: {
      following: !state.following,
      followersCount: state.following
        ? Math.max(0, state.followersCount - 1)
        : state.followersCount + 1,
      inFlight: true,
    },
    intent: state.following ? 'unfollow' : 'follow',
  };
}


export function settled(state: FollowState): FollowState {
  return { ...state, inFlight: false };
}


export function reverted(before: FollowState): FollowState {
  return { ...before, inFlight: false };
}
