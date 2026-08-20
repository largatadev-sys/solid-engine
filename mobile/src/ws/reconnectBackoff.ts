export const BACKOFF_START_MS = 1000;

export const BACKOFF_CAP_MS = 30000;

export function delayForAttempt(attempt: number, jitter: () => number = Math.random): number {
  const step = Math.max(attempt, 1) - 1;
  const base = Math.min(BACKOFF_START_MS * 2 ** step, BACKOFF_CAP_MS);
  return Math.min(Math.round(base + base * jitter()), BACKOFF_CAP_MS);
}
