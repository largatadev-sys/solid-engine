import { dateToIso, isIsoDate, isoToDate } from '../src/itineraries/isoDate';

/**
 * The ISO calendar-date helpers (S1.3, ticket 04). The point worth pinning: a calendar date is a day,
 * not an instant, so conversion must never shift the day across a timezone boundary — hence the UTC
 * round-trip.
 */

describe('isIsoDate', () => {
  it('accepts a well-formed, real date', () => {
    expect(isIsoDate('2027-01-10')).toBe(true);
  });

  it('rejects a wrong shape', () => {
    expect(isIsoDate('2027-1-10')).toBe(false);
    expect(isIsoDate('next June')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('rejects a shape that parses to a different day (2027-02-31)', () => {
    expect(isIsoDate('2027-02-31')).toBe(false);
  });
});

describe('isoToDate / dateToIso round-trip', () => {
  it('round-trips a date without shifting the day', () => {
    const date = isoToDate('2027-01-10');
    expect(date).toBeDefined();
    expect(dateToIso(date as Date)).toBe('2027-01-10');
  });

  it('formats a UTC-midnight date to its calendar day', () => {
    expect(dateToIso(new Date('2027-12-31T00:00:00Z'))).toBe('2027-12-31');
  });

  it('returns undefined for an unset or invalid value', () => {
    expect(isoToDate('')).toBeUndefined();
    expect(isoToDate('garbage')).toBeUndefined();
  });

  it('zero-pads single-digit months and days', () => {
    expect(dateToIso(new Date('2027-03-05T00:00:00Z'))).toBe('2027-03-05');
  });
});
