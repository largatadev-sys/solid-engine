import { BACKOFF_CAP_MS, BACKOFF_START_MS, delayForAttempt } from '../src/ws/reconnectBackoff';

const NO_JITTER = () => 0;
const FULL_JITTER = () => 0.999999;

describe('delayForAttempt', () => {
  it('starts at one second on the first retry', () => {
    expect(delayForAttempt(1, NO_JITTER)).toBe(BACKOFF_START_MS);
  });

  it('doubles on each subsequent attempt', () => {
    expect(delayForAttempt(2, NO_JITTER)).toBe(2000);
    expect(delayForAttempt(3, NO_JITTER)).toBe(4000);
    expect(delayForAttempt(4, NO_JITTER)).toBe(8000);
    expect(delayForAttempt(5, NO_JITTER)).toBe(16000);
  });

  it('caps at thirty seconds rather than doubling forever', () => {
    expect(delayForAttempt(6, NO_JITTER)).toBe(BACKOFF_CAP_MS);
    expect(delayForAttempt(50, NO_JITTER)).toBe(BACKOFF_CAP_MS);
  });

  it('never exceeds the cap even at full jitter, so a client cannot sleep past it', () => {
    for (let attempt = 1; attempt <= 50; attempt++) {
      expect(delayForAttempt(attempt, FULL_JITTER)).toBeLessThanOrEqual(BACKOFF_CAP_MS);
    }
  });

  it('adds jitter within the attempt window so reconnecting clients do not stampede', () => {
    const jittered = delayForAttempt(3, FULL_JITTER);

    expect(jittered).toBeGreaterThan(4000);
    expect(jittered).toBeLessThanOrEqual(8000);
  });

  it('treats a zeroth or negative attempt as the first rather than returning nothing', () => {
    expect(delayForAttempt(0, NO_JITTER)).toBe(BACKOFF_START_MS);
    expect(delayForAttempt(-3, NO_JITTER)).toBe(BACKOFF_START_MS);
  });

  it('is deterministic for a given attempt and jitter source', () => {
    expect(delayForAttempt(4, NO_JITTER)).toBe(delayForAttempt(4, NO_JITTER));
  });
});
