import { dayName, dayPrefix, dayTitleLine } from '../src/itineraries/dayTitle';


describe('dayPrefix — the part the traveler cannot edit away', () => {
  it('is the ordinal, and nothing else', () => {
    expect(dayPrefix({ ordinal: 1 })).toBe('Day 1');
    expect(dayPrefix({ ordinal: 12 })).toBe('Day 12');
  });

  it('never carries the name, whatever the day is called', () => {
    expect(dayPrefix({ ordinal: 3 })).not.toContain(':');
  });
});


describe('dayName — the editable half, which is what the input holds', () => {
  it('is the title alone, without the ordinal', () => {
    expect(dayName({ title: 'Lagoon Tour A' })).toBe('Lagoon Tour A');
  });

  it('is empty on an unnamed day, so the input opens blank rather than pre-filled', () => {
    expect(dayName({ title: null })).toBe('');
    expect(dayName({ title: '' })).toBe('');
  });
});


describe('dayTitleLine — the two halves joined for display', () => {
  it('renders "Day N: name" when the day has been named (the mock line)', () => {
    expect(dayTitleLine({ ordinal: 1, title: 'Lagoon Tour A' })).toBe('Day 1: Lagoon Tour A');
  });

  it('drops the colon entirely on an unnamed day — never a dangling "Day 1:"', () => {
    expect(dayTitleLine({ ordinal: 1, title: null })).toBe('Day 1');
    expect(dayTitleLine({ ordinal: 1, title: '' })).toBe('Day 1');
    expect(dayTitleLine({ ordinal: 1, title: '   ' })).toBe('Day 1');
  });

  it('keeps the prefix even when the name would swallow it', () => {
    expect(dayTitleLine({ ordinal: 2, title: 'Day 9' })).toBe('Day 2: Day 9');
  });
});
