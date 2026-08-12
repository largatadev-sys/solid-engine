export const STUB_METRICS_ON = true;


export function stubFollowerCount(on: boolean = STUB_METRICS_ON): number {
  return on ? integerBetween(1, 100) : 0;
}


export function stubFollowingCount(on: boolean = STUB_METRICS_ON): number {
  return on ? integerBetween(1, 100) : 0;
}


export function stubLikeCount(on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(1, 100) : null;
}


export function stubRating(on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(10, 50) / 10 : null;
}


export function stubPricePerPerson(on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(100, 200) * 100 : null;
}


function integerBetween(lowest: number, highest: number): number {
  return lowest + Math.floor(Math.random() * (highest - lowest + 1));
}
