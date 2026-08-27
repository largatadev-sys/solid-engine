import { removalMotion } from '../theme/removalTokens';


export const REVEAL_PX = removalMotion.revealPx;

export const OVERDRAG_PX = removalMotion.overdragPx;

export const ENGAGE_PX = removalMotion.engagePx;

export const OPEN_X = -REVEAL_PX;

const FLOOR_X = -(REVEAL_PX + OVERDRAG_PX);

const HALF_X = OPEN_X / 2;


export function trackedX(baseX: number, dx: number): number {
  return Math.min(0, Math.max(FLOOR_X, baseX + dx));
}


export function engages(dx: number, dy: number): boolean {
  return Math.abs(dx) >= ENGAGE_PX && Math.abs(dx) > Math.abs(dy);
}


export function landsOpen(x: number): boolean {
  return x < HALF_X;
}


export function restingX(x: number): number {
  return landsOpen(x) ? OPEN_X : 0;
}
