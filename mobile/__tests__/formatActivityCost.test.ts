import { activityMetaLine, formatActivityCost } from '../src/itineraries/formatActivityCost';



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

describe('activityMetaLine — joining time and cost', () => {
  it('joins a time and a cost with a dot', () => {
    expect(activityMetaLine('14:00', '500', 'PHP')).toBe('14:00 · PHP 500');
  });

  it('shows only the time when the cost is unstated', () => {
    expect(activityMetaLine('14:00', null, null)).toBe('14:00');
  });

  it('shows only the cost when there is no time', () => {
    expect(activityMetaLine(null, '0', 'PHP')).toBe('Free');
  });

  it('is empty when neither is present', () => {
    expect(activityMetaLine(null, null, null)).toBe('');
  });
});
