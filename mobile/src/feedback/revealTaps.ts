export const TAPS_TO_REVEAL = 5;

export const TAP_WINDOW_MS = 600;

export type TapRun = {
  readonly count: number;
  readonly at: number;
};

export const NO_TAPS: TapRun = { count: 0, at: 0 };


export function afterTap(run: TapRun, now: number, windowMs = TAP_WINDOW_MS): TapRun {
  const continues = run.count > 0 && now - run.at <= windowMs;
  return { count: continues ? run.count + 1 : 1, at: now };
}


export function reveals(run: TapRun, target = TAPS_TO_REVEAL): boolean {
  return run.count === target;
}
