import type { ProfileVisibility, ViewerRelation } from '../types/api';


export interface FollowState {
  readonly relation: ViewerRelation;
  readonly followersCount: number;
  readonly visibility: ProfileVisibility;
  readonly inFlight: boolean;
}

export type FollowIntent = 'follow' | 'unfollow';

export interface FollowTap {
  readonly state: FollowState;
  readonly intent: FollowIntent | null;
}


export function followStateFrom(
  relation: ViewerRelation,
  followersCount: number,
  visibility: ProfileVisibility,
): FollowState {
  return { relation, followersCount, visibility, inFlight: false };
}


export function tapped(state: FollowState): FollowTap {
  if (state.inFlight) {
    return { state, intent: null };
  }

  if (state.relation === 'none') {
    const predicted: ViewerRelation = state.visibility === 'private' ? 'requested' : 'following';
    return {
      state: {
        ...state,
        relation: predicted,
        followersCount: countFor(state.followersCount, 'none', predicted),
        inFlight: true,
      },
      intent: 'follow',
    };
  }

  return {
    state: {
      ...state,
      relation: 'none',
      followersCount: countFor(state.followersCount, state.relation, 'none'),
      inFlight: true,
    },
    intent: 'unfollow',
  };
}


export function settled(state: FollowState, served: ViewerRelation): FollowState {
  return {
    ...state,
    relation: served,
    followersCount: countFor(state.followersCount, state.relation, served),
    inFlight: false,
  };
}


export function reverted(before: FollowState): FollowState {
  return { ...before, inFlight: false };
}


function countFor(count: number, from: ViewerRelation, to: ViewerRelation): number {
  const edges = (relation: ViewerRelation) => (relation === 'following' ? 1 : 0);
  return Math.max(0, count + edges(to) - edges(from));
}
