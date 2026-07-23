import { validateActivityForm } from '../src/itineraries/validateActivityForm';

/**
 * The activity form's client-side rules (S1.3, ticket 02) — mirroring the server's `@Pattern` +
 * `ActivityFields`. The interesting cases are the cross-field cost rule and the time format.
 */

const valid = { title: 'Airport Transfer', timeOfDay: '', costAmount: '', costCurrency: '' };

describe('what an activity form accepts', () => {
  it('accepts a bare title — everything else is optional', () => {
    expect(validateActivityForm(valid)).toBeUndefined();
  });

  it('accepts a well-formed 24h time', () => {
    expect(validateActivityForm({ ...valid, timeOfDay: '14:00' })).toBeUndefined();
    expect(validateActivityForm({ ...valid, timeOfDay: '09:30:00' })).toBeUndefined();
  });

  it('accepts an amount with a currency', () => {
    expect(validateActivityForm({ ...valid, costAmount: '500.00', costCurrency: 'PHP' })).toBeUndefined();
  });

  it('accepts a zero amount with a currency — "Free" is a real, stated cost', () => {
    expect(validateActivityForm({ ...valid, costAmount: '0', costCurrency: 'PHP' })).toBeUndefined();
  });
});

describe('what an activity form rejects', () => {
  it('rejects a blank title', () => {
    expect(validateActivityForm({ ...valid, title: '   ' })).toBe('An activity needs a title.');
  });

  it('rejects prose where a time belongs', () => {
    expect(validateActivityForm({ ...valid, timeOfDay: 'banana' })).toMatch(/14:00/);
  });

  it('rejects an out-of-range hour', () => {
    expect(validateActivityForm({ ...valid, timeOfDay: '25:00' })).toMatch(/14:00/);
  });

  it('rejects a non-numeric amount', () => {
    expect(validateActivityForm({ ...valid, costAmount: 'lots', costCurrency: 'PHP' })).toMatch(/number/);
  });

  it('rejects an amount with no currency — the two are one fact', () => {
    expect(validateActivityForm({ ...valid, costAmount: '500' })).toMatch(/currency/);
  });

  it('rejects a currency with no amount', () => {
    expect(validateActivityForm({ ...valid, costCurrency: 'PHP' })).toMatch(/amount/);
  });
});
