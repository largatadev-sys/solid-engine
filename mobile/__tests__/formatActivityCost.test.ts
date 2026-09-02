import {
  activityMetaLine,
  activityMetaParts,
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

describe('activityMetaLine — when • where, and no money (founder, 2026-08-18)', () => {
  it('reads time then place, bulleted', () => {
    expect(activityMetaLine('17:30', 'Lio Beach')).toBe('05:30 PM • Lio Beach');
  });

  it('shows the time alone when the activity names no place', () => {
    expect(activityMetaLine('14:00', null)).toBe('02:00 PM');
  });

  it('shows the place alone when the activity names no time', () => {
    expect(activityMetaLine(null, 'Puka Beach')).toBe('Puka Beach');
  });

  it('is empty when it knows neither', () => {
    expect(activityMetaLine(null, null)).toBe('');
  });

  it('treats a blank place as no place, never as an empty segment', () => {
    expect(activityMetaLine('09:00', '   ')).toBe('09:00 AM');
  });

  it('carries no cost, whatever the activity is priced at', () => {
    expect(activityMetaLine('17:30', 'Lio Beach')).not.toMatch(/₱|\$|1,500/);
  });

  it('separates with U+2022 BULLET, not the U+00B7 the rest of the app joins with', () => {
    const line = activityMetaLine('17:30', 'Lio Beach');

    expect(line).toContain('•');
    expect(line).not.toContain('·');
    expect(line.split(' • ')).toHaveLength(2);
  });
});


describe('activityMetaParts — the split that lets the place alone be tappable (PL-1)', () => {
  it('hands back the clock and the place separately', () => {
    expect(activityMetaParts('17:30', 'Lio Beach')).toEqual({
      clock: '5:30 PM',
      place: 'Lio Beach',
    });
  });

  it('unpads the leading hour zero — the diary postcardClock shape', () => {
    expect(activityMetaParts('09:05', null).clock).toBe('9:05 AM');
    expect(activityMetaParts('00:30', null).clock).toBe('12:30 AM');
  });

  it('leaves the place undefined when the activity names none', () => {
    expect(activityMetaParts('14:00', null)).toEqual({ clock: '2:00 PM', place: undefined });
  });

  it('treats a blank place as no place', () => {
    expect(activityMetaParts('09:00', '   ').place).toBeUndefined();
  });

  it('leaves the clock undefined when the activity names no time', () => {
    expect(activityMetaParts(null, 'Puka Beach')).toEqual({
      clock: undefined,
      place: 'Puka Beach',
    });
  });

  it('knows neither when told neither', () => {
    expect(activityMetaParts(null, null)).toEqual({ clock: undefined, place: undefined });
  });

  it('trims the place it hands back, so the link text carries no stray spacing', () => {
    expect(activityMetaParts(null, '  Lio Beach  ').place).toBe('Lio Beach');
  });

  it('hands back whatever it cannot read as a clock rather than inventing one', () => {
    expect(activityMetaParts('banana', null).clock).toBe('banana');
  });
});
