import { formatDates } from '../src/itineraries/formatDates';

/**
 * Date rendering (S0.3, ticket 07).
 *
 * **Every case here passes `null`, not `undefined`, and that is the whole point.** The first version
 * of this function checked `!== undefined` and had thirteen green tests written against objects
 * where an absent date meant `undefined`. The server sends `"startDate": null`. The device rendered
 * "null → null" for the dreamer's undated draft — the exact case the function exists for — while the
 * suite stayed green, because the tests and the wire disagreed about what "no date" looks like.
 *
 * The lesson, worth more than the fix: a test that builds its own input can only ever assert what
 * the author already believed. These use the server's shape.
 */

describe('what the server actually sends', () => {
  it('renders both dates when the trip has them', () => {
    expect(formatDates({ startDate: '2027-01-10', endDate: '2027-01-20' })).toBe('2027-01-10 → 2027-01-20');
  });

  it('says the dates are undecided when both are null — the dreamer draft', () => {
    expect(formatDates({ startDate: null, endDate: null })).toBe('Dates to be decided');
  });

  it('renders a start with no end — "departing June 3, open-ended"', () => {
    expect(formatDates({ startDate: '2027-06-03', endDate: null })).toBe('From 2027-06-03');
  });

  it('renders an end with no start', () => {
    expect(formatDates({ startDate: null, endDate: '2027-06-03' })).toBe('Until 2027-06-03');
  });

  it('never renders the words null or undefined, whatever it is handed', () => {
    // The regression itself: this is what shipped to the emulator.
    const everyShape = [
      { startDate: null, endDate: null },
      { startDate: '2027-01-10', endDate: null },
      { startDate: null, endDate: '2027-01-20' },
      { startDate: '2027-01-10', endDate: '2027-01-20' },
    ];

    for (const shape of everyShape) {
      expect(formatDates(shape)).not.toMatch(/null|undefined/);
    }
  });
});
