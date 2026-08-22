import {
  cascadeDelayFor,
  onTabBlurred,
  onTabFocused,
  UNVISITED,
} from '../src/members/cascade';
import { travelerMotion } from '../src/theme/workspaceTokens';

describe('the M6 stagger', () => {
  it('steps 30ms down the list', () => {
    expect(cascadeDelayFor(0, false)).toBe(0);
    expect(cascadeDelayFor(1, false)).toBe(30);
    expect(cascadeDelayFor(3, false)).toBe(90);
  });

  it('caps at ten rows, so a long roster does not trail off the screen', () => {
    const capped = travelerMotion.cascadeCap * travelerMotion.cascadeStepMs;

    expect(cascadeDelayFor(travelerMotion.cascadeCap, false)).toBe(capped);
    expect(cascadeDelayFor(40, false)).toBe(capped);
  });

  it('jump-cuts entirely under Reduce Motion', () => {
    expect(cascadeDelayFor(0, true)).toBe(0);
    expect(cascadeDelayFor(40, true)).toBe(0);
  });
});

describe('the once-per-visit guard', () => {
  it('plays on the first focus', () => {
    const focused = onTabFocused(UNVISITED);

    expect(focused.visit).toBe(1);
    expect(focused.playedThisVisit).toBe(true);
  });

  it('does not replay on a re-render while the tab stays focused', () => {
    const first = onTabFocused(UNVISITED);
    const again = onTabFocused(first);

    expect(again.visit).toBe(1);
    expect(again).toBe(first);
  });

  it('replays only after the traveler leaves and comes back', () => {
    const first = onTabFocused(UNVISITED);
    const left = onTabBlurred(first);
    const returned = onTabFocused(left);

    expect(returned.visit).toBe(2);
  });

  it('keeps the visit number while blurred, so nothing re-animates on the way out', () => {
    const first = onTabFocused(UNVISITED);

    expect(onTabBlurred(first).visit).toBe(first.visit);
  });

  it('survives a run of focus and blur without drifting', () => {
    let state = UNVISITED;
    for (let visit = 1; visit <= 5; visit += 1) {
      state = onTabFocused(state);
      expect(state.visit).toBe(visit);
      state = onTabFocused(state);
      expect(state.visit).toBe(visit);
      state = onTabBlurred(state);
    }
  });
});
