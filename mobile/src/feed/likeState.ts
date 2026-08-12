export interface LikeState {
  readonly liked: boolean;
  readonly count: number;
}


export function likeStateFrom(base: number): LikeState {
  return { liked: false, count: base };
}


export function toggled(state: LikeState): LikeState {
  return state.liked
    ? { liked: false, count: Math.max(0, state.count - 1) }
    : { liked: true, count: state.count + 1 };
}


export function burstLiked(state: LikeState): LikeState {
  return state.liked ? state : { liked: true, count: state.count + 1 };
}
