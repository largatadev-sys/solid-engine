import { formatDates } from '../src/itineraries/formatDates';



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
