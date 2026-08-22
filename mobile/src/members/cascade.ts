import { travelerMotion } from '../theme/workspaceTokens';


export function cascadeDelayFor(index: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const capped = Math.min(index, travelerMotion.cascadeCap);
  return capped * travelerMotion.cascadeStepMs;
}


export interface CascadeGate {
  readonly played: boolean;
  readonly visitKey: number;
}


export function cascadeGateFor(
  focused: boolean,
  previous: CascadeGate,
): CascadeGate {
  if (!focused) return { played: false, visitKey: previous.visitKey };
  if (previous.played) return previous;
  return { played: true, visitKey: previous.visitKey + 1 };
}
