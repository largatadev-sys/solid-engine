import { travelerMotion } from '../theme/workspaceTokens';


export function cascadeDelayFor(index: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const capped = Math.min(index, travelerMotion.cascadeCap);
  return capped * travelerMotion.cascadeStepMs;
}


export interface VisitState {
  readonly visit: number;
  readonly playedThisVisit: boolean;
}

export const UNVISITED: VisitState = { visit: 0, playedThisVisit: false };


export function onTabFocused(state: VisitState): VisitState {
  if (state.playedThisVisit) return state;
  return { visit: state.visit + 1, playedThisVisit: true };
}


export function onTabBlurred(state: VisitState): VisitState {
  return { visit: state.visit, playedThisVisit: false };
}
