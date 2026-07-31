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

  it('shows the currency and amount when a price is set', () => {
    expect(formatActivityCost('500.00', 'PHP')).toBe('PHP 500.00');
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

describe('activityMetaLine — joining time and cost', () => {
  it('joins a 12-hour time and a cost with a dot', () => {
    expect(activityMetaLine('14:00', '500', 'PHP')).toBe('02:00 PM · PHP 500');
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
});
