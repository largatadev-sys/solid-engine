import { instantOfParts, isInTheFuture, partsOfInstant } from '../src/polls/pollDeadline';


describe('the poll deadline — a UTC instant the traveler picks in their own zone', () => {
  it('round-trips an instant through the two pickers without drifting', () => {
    const instant = new Date(2026, 9, 24, 18, 0, 0, 0).toISOString();

    expect(instantOfParts(partsOfInstant(instant))).toBe(instant);
  });

  it('splits an instant into the LOCAL date and time the pickers show', () => {
    const local = new Date(2026, 9, 24, 18, 30, 0, 0);

    expect(partsOfInstant(local.toISOString())).toEqual({ date: '2026-10-24', time: '18:30' });
  });

  it('composes back to UTC, so a device east of Greenwich does not submit yesterday', () => {
    const composed = instantOfParts({ date: '2026-10-24', time: '18:00' });

    expect(composed).toBe(new Date(2026, 9, 24, 18, 0, 0, 0).toISOString());
  });

  it('refuses half a deadline rather than guessing the missing half', () => {
    expect(instantOfParts({ date: '2026-10-24', time: '' })).toBeNull();
    expect(instantOfParts({ date: '', time: '18:00' })).toBeNull();
    expect(instantOfParts({ date: 'tomorrow', time: '18:00' })).toBeNull();
  });

  it('holds the server’s rule that a deadline is strictly in the future', () => {
    const now = Date.parse('2026-10-24T12:00:00Z');

    expect(isInTheFuture('2026-10-24T12:00:01Z', now)).toBe(true);
    expect(isInTheFuture('2026-10-24T12:00:00Z', now)).toBe(false);
    expect(isInTheFuture('2026-10-24T11:59:59Z', now)).toBe(false);
    expect(isInTheFuture(null, now)).toBe(false);
  });
});
