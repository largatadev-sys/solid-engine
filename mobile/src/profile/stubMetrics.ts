export const STUB_METRICS_ON = true;


export function stubFollowerCountFor(subjectId: string, on: boolean = STUB_METRICS_ON): number {
  return on ? integerBetween(subjectId, 'followers', 1, 100) : 0;
}


export function stubFollowingCountFor(subjectId: string, on: boolean = STUB_METRICS_ON): number {
  return on ? integerBetween(subjectId, 'following', 1, 100) : 0;
}


export function stubLikeCountFor(subjectId: string, on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(subjectId, 'likes', 1, 1400) : null;
}


export function stubCommentCountFor(
  subjectId: string,
  on: boolean = STUB_METRICS_ON,
): number | null {
  return on ? integerBetween(subjectId, 'comments', 0, 60) : null;
}


export function stubRatingFor(subjectId: string, on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(subjectId, 'rating', 10, 50) / 10 : null;
}


export function stubPricePerPersonFor(
  subjectId: string,
  on: boolean = STUB_METRICS_ON,
): number | null {
  return on ? integerBetween(subjectId, 'price', 100, 200) * 100 : null;
}


function integerBetween(subjectId: string, metric: string, lowest: number, highest: number): number {
  const span = highest - lowest + 1;
  return lowest + (hash(`${metric}:${subjectId}`) % span);
}


function hash(seed: string): number {
  let accumulated = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    accumulated ^= seed.charCodeAt(index);
    accumulated = Math.imul(accumulated, 16777619);
  }
  accumulated ^= accumulated >>> 15;
  return accumulated >>> 0;
}
