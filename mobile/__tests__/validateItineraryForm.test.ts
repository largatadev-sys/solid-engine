import { validateItineraryForm } from '../src/itineraries/validateItineraryForm';

/**
 * The create form's client-side rules (S0.3, ticket 07).
 *
 * These mirror the server's, and the interesting cases are the ones where "obviously invalid" is
 * wrong: a trip with no dates is a plan, not an incomplete form.
 */

const valid = { title: 'Hokkaido in winter', destination: 'Sapporo', startDate: '', endDate: '' };

describe('what a plan is allowed to be', () => {
  it('accepts a trip with no dates at all — the dreamer draft', () => {
    expect(validateItineraryForm(valid)).toBeUndefined();
  });

  it('accepts a start with no end — "departing June 3, open-ended"', () => {
    expect(validateItineraryForm({ ...valid, startDate: '2027-06-03' })).toBeUndefined();
  });

  it('accepts an end with no start', () => {
    expect(validateItineraryForm({ ...valid, endDate: '2027-06-03' })).toBeUndefined();
  });

  it('accepts a trip that starts and ends on the same day', () => {
    expect(
      validateItineraryForm({ ...valid, startDate: '2027-06-03', endDate: '2027-06-03' }),
    ).toBeUndefined();
  });
});

describe('what a plan is not allowed to be', () => {
  it('rejects a blank title', () => {
    expect(validateItineraryForm({ ...valid, title: '   ' })).toBe('A title is required.');
  });

  it('rejects a title past the server-s limit', () => {
    expect(validateItineraryForm({ ...valid, title: 'x'.repeat(121) })).toMatch(/120 characters/);
  });

  it('rejects a blank destination', () => {
    expect(validateItineraryForm({ ...valid, destination: '  ' })).toMatch(/destination/);
  });

  it('rejects an end before the start', () => {
    expect(validateItineraryForm({ ...valid, startDate: '2027-06-10', endDate: '2027-06-03' })).toBe(
      'A trip cannot end before it starts.',
    );
  });

  it('rejects prose where a date belongs', () => {
    expect(validateItineraryForm({ ...valid, startDate: 'next June' })).toMatch(/2027-01-10/);
  });

  it('rejects a date that looks right but does not exist', () => {
    // The regex says shape; February says otherwise.
    expect(validateItineraryForm({ ...valid, startDate: '2027-02-31' })).toMatch(/2027-01-10/);
  });
});
