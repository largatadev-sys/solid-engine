import {
  DATES_TO_BE_DECIDED,
  tripDates,
  workspaceFactsLine,
} from '../src/itineraries/workspaceFactsLine';


describe('the workspace facts line — destination · dates, exactly two facts (S4.25 artboard 1)', () => {
  it('draws the baseline string a dated trip shows', () => {
    expect(
      workspaceFactsLine({ destination: 'Boracay', startDate: '2027-03-12', endDate: '2027-03-19' }),
    ).toBe('Boracay · 12–19 Mar 2027');
  });

  it('draws the baseline string an undated trip shows', () => {
    expect(workspaceFactsLine({ destination: 'Boracay', startDate: null, endDate: null })).toBe(
      'Boracay · Dates to be decided',
    );
  });

  it('never renders a third fact', () => {
    const line = workspaceFactsLine({
      destination: 'Boracay',
      startDate: '2027-03-12',
      endDate: '2027-03-19',
    });

    expect(line.split(' · ')).toHaveLength(2);
  });
});


describe('the dates half', () => {
  it('collapses a same-month range to one month and year', () => {
    expect(tripDates({ startDate: '2027-03-12', endDate: '2027-03-19' })).toBe('12–19 Mar 2027');
  });

  it('names both months when the trip crosses one', () => {
    expect(tripDates({ startDate: '2027-03-28', endDate: '2027-04-03' })).toBe('28 Mar – 3 Apr 2027');
  });

  it('names both years when the trip crosses one', () => {
    expect(tripDates({ startDate: '2027-12-28', endDate: '2028-01-03' })).toBe(
      '28 Dec 2027 – 3 Jan 2028',
    );
  });

  it('draws a single day once, not as a range', () => {
    expect(tripDates({ startDate: '2027-03-12', endDate: '2027-03-12' })).toBe('12 Mar 2027');
  });

  it('carries a half-open range rather than pretending the trip has no dates', () => {
    expect(tripDates({ startDate: '2027-03-12', endDate: null })).toBe('From 12 Mar 2027');
    expect(tripDates({ startDate: null, endDate: '2027-03-19' })).toBe('Until 19 Mar 2027');
  });

  it('says the dates are undecided when they are', () => {
    expect(tripDates({ startDate: null, endDate: null })).toBe(DATES_TO_BE_DECIDED);
  });

  it('never leaks a null or an undefined into what the traveler reads', () => {
    const shapes = [
      { startDate: null, endDate: null },
      { startDate: '2027-03-12', endDate: null },
      { startDate: null, endDate: '2027-03-19' },
      { startDate: '2027-03-12', endDate: '2027-03-19' },
    ];

    shapes.forEach((shape) => expect(tripDates(shape)).not.toMatch(/null|undefined|NaN/));
  });
});
