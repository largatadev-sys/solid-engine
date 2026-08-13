export const PAGE_SIZE = 20;

export const FETCH_AHEAD_CARDS = 5;

export const SKELETON_CARDS = 2;


export function fetchesMore(
  visibleIndex: number,
  loaded: number,
  hasMore: boolean,
  alreadyFetching: boolean,
): boolean {
  if (!hasMore || alreadyFetching || loaded === 0) {
    return false;
  }
  return visibleIndex >= loaded - FETCH_AHEAD_CARDS;
}
