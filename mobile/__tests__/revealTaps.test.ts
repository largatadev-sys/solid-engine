import {
  afterTap,
  NO_TAPS,
  reveals,
  TAP_WINDOW_MS,
  TAPS_TO_REVEAL,
  type TapRun,
} from '../src/feedback/revealTaps';

const rapid = (count: number, gap = 100): TapRun => {
  let run = NO_TAPS;
  for (let tap = 0; tap < count; tap += 1) {
    run = afterTap(run, tap * gap);
  }
  return run;
};

describe('the reveal tap counter', () => {
  it('reveals on five taps inside the window', () => {
    expect(reveals(rapid(TAPS_TO_REVEAL))).toBe(true);
  });

  it('does not reveal on four', () => {
    expect(reveals(rapid(TAPS_TO_REVEAL - 1))).toBe(false);
  });

  it('resets the count when a tap falls outside the window', () => {
    let run = rapid(4);
    run = afterTap(run, run.at + TAP_WINDOW_MS + 1);

    expect(run.count).toBe(1);
    expect(reveals(run)).toBe(false);
  });

  it('counts a tap exactly on the window boundary as continuing the run', () => {
    let run = rapid(4);
    run = afterTap(run, run.at + TAP_WINDOW_MS);

    expect(run.count).toBe(TAPS_TO_REVEAL);
    expect(reveals(run)).toBe(true);
  });

  it('is inert on a sixth tap, so holding the gesture does not re-fire', () => {
    const sixth = afterTap(rapid(TAPS_TO_REVEAL), 500);

    expect(sixth.count).toBe(6);
    expect(reveals(sixth)).toBe(false);
  });

  it('needs five more taps after a slow gap, not one', () => {
    let run = rapid(4);
    run = afterTap(run, run.at + TAP_WINDOW_MS + 1);
    for (let tap = 1; tap < TAPS_TO_REVEAL - 1; tap += 1) {
      run = afterTap(run, run.at + 100);
      expect(reveals(run)).toBe(false);
    }

    expect(reveals(afterTap(run, run.at + 100))).toBe(true);
  });
});
