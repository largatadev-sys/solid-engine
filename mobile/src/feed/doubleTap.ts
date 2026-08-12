export const DOUBLE_TAP_MS = 300;

export const TAP_SLOP = 10;


export interface TapPoint {
  readonly x: number;
  readonly y: number;
  readonly at: number;
}


export function isTap(from: TapPoint, to: TapPoint): boolean {
  return Math.abs(to.x - from.x) <= TAP_SLOP && Math.abs(to.y - from.y) <= TAP_SLOP;
}


export function isDoubleTap(previous: TapPoint | null, next: TapPoint): boolean {
  if (previous === null) {
    return false;
  }
  return next.at - previous.at <= DOUBLE_TAP_MS && isTap(previous, next);
}
