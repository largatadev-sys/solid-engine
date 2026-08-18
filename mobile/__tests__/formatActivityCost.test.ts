import {
  activityMetaLine,
  formatActivityCost,
  formatTimeOfDay,
} from '../src/itineraries/formatActivityCost';



describe('formatActivityCost — the null/0/price distinction', () => {
  it('shows nothing when the cost is unstated (null)', () => {
    expect(formatActivityCost(null, null)).toBeUndefined();
  });

  it('shows "Free" when the amount is zero — a real, stated fact, not the same as unstated', () => {
    expect(formatActivityCost('0', 'PHP')).toBe('Free');
    expect(formatActivityCost('0.00', 'PHP')).toBe('Free');
  });

  it('shows the currency SIGN, not the code — the mock reads ₱800', () => {
    expect(formatActivityCost('800', 'PHP')).toBe('₱800');
    expect(formatActivityCost('500.00', 'PHP')).toBe('₱500');
    expect(formatActivityCost('20', 'USD')).toBe('$20');
  });

  it('groups thousands, because ₱1200 is harder to read than ₱1,200', () => {
    expect(formatActivityCost('1200.00', 'PHP')).toBe('₱1,200');
    expect(formatActivityCost('1234567', 'PHP')).toBe('₱1,234,567');
  });

  it('keeps cents when there are cents, and drops them when there are none', () => {
    expect(formatActivityCost('1200.50', 'PHP')).toBe('₱1,200.50');
    expect(formatActivityCost('1200.00', 'PHP')).toBe('₱1,200');
  });

  it('falls back to the code, spaced, for a currency it has no sign for', () => {
    expect(formatActivityCost('500', 'XYZ')).toBe('XYZ 500');
  });

  it('shows just the amount if somehow no currency rode along', () => {
    expect(formatActivityCost('500', null)).toBe('500');
  });
});

describe('formatTimeOfDay — the mock reads 12-hour with AM/PM, the server stores 24-hour', () => {
  it('renders an afternoon time as PM', () => {
    expect(formatTimeOfDay('13:00')).toBe('01:00 PM');
    expect(formatTimeOfDay('18:30')).toBe('06:30 PM');
  });

  it('renders a morning time as AM', () => {
    expect(formatTimeOfDay('10:00')).toBe('10:00 AM');
    expect(formatTimeOfDay('09:05')).toBe('09:05 AM');
  });

  it('calls midnight 12 AM and noon 12 PM, not 00 and 00', () => {
    expect(formatTimeOfDay('00:00')).toBe('12:00 AM');
    expect(formatTimeOfDay('00:30')).toBe('12:30 AM');
    expect(formatTimeOfDay('12:00')).toBe('12:00 PM');
    expect(formatTimeOfDay('12:45')).toBe('12:45 PM');
  });

  it('handles the seconds the server may append', () => {
    expect(formatTimeOfDay('14:00:00')).toBe('02:00 PM');
  });

  it('shows nothing when there is no time', () => {
    expect(formatTimeOfDay(null)).toBeUndefined();
  });

  it('hands back anything it cannot read rather than inventing a time', () => {
    expect(formatTimeOfDay('banana')).toBe('banana');
    expect(formatTimeOfDay('25:00')).toBe('25:00');
  });
});

describe('activityMetaLine — joining time, place and cost', () => {
  it('joins a 12-hour time and a cost with a bullet', () => {
    expect(activityMetaLine('14:00', '500', 'PHP')).toBe('02:00 PM • ₱500');
  });

  it('shows only the time when the cost is unstated', () => {
    expect(activityMetaLine('14:00', null, null)).toBe('02:00 PM');
  });

  it('shows only the cost when there is no time', () => {
    expect(activityMetaLine(null, '0', 'PHP')).toBe('Free');
  });

  it('is empty when neither is present', () => {
    expect(activityMetaLine(null, null, null)).toBe('');
  });

  it('reads when • where • how much, in that order (founder, 2026-08-18)', () => {
    expect(activityMetaLine('17:30', '1500', 'PHP', 'Lio Beach')).toBe(
      '05:30 PM • Lio Beach • ₱1,500',
    );
  });

  it('carries the place between a time and a missing cost', () => {
    expect(activityMetaLine('09:00', null, null, 'Big Lagoon')).toBe('09:00 AM • Big Lagoon');
  });

  it('carries the place alone when it is all the activity states', () => {
    expect(activityMetaLine(null, null, null, 'Puka Beach')).toBe('Puka Beach');
  });

  it('treats a blank or absent place as no place, never as an empty segment', () => {
    expect(activityMetaLine('09:00', null, null, '   ')).toBe('09:00 AM');
    expect(activityMetaLine('09:00', null, null, null)).toBe('09:00 AM');
    expect(activityMetaLine('09:00', null, null)).toBe('09:00 AM');
  });

  it('separates every segment with U+2022 BULLET (founder, 2026-08-18)', () => {
    const line = activityMetaLine('17:30', '1500', 'PHP', 'Lio Beach');

    expect(line).toContain('•');
    expect(line).not.toContain('·');
    expect(line.split(' • ')).toHaveLength(3);
  });
});
