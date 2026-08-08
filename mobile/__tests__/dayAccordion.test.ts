import { defaultOpenDay, toggleOpenDay } from '../src/itineraries/dayAccordion';


describe('defaultOpenDay', () => {
  it('opens Day 1 by default', () => {
    expect(defaultOpenDay(['d1', 'd2', 'd3'])).toBe('d1');
  });

  it('opens nothing when the trip has no days', () => {
    expect(defaultOpenDay([])).toBeNull();
  });

  it('honours a requested day, so a ?day= deep link lands expanded', () => {
    expect(defaultOpenDay(['d1', 'd2', 'd3'], 'd3')).toBe('d3');
  });

  it('falls back to Day 1 when the requested day is not in the trip', () => {
    expect(defaultOpenDay(['d1', 'd2'], 'gone')).toBe('d1');
  });
});


describe('toggleOpenDay', () => {
  it('keeps a single day open — opening one closes the other', () => {
    expect(toggleOpenDay('d1', 'd2')).toBe('d2');
  });

  it('collapses the open day when it is tapped again', () => {
    expect(toggleOpenDay('d1', 'd1')).toBeNull();
  });

  it('opens a day from a fully collapsed list', () => {
    expect(toggleOpenDay(null, 'd2')).toBe('d2');
  });
});
