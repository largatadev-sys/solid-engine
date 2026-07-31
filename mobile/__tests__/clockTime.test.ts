import { clockToDate, dateToClock, twelveHour } from '../src/itineraries/clockTime';


describe('the picker shows 12-hour but the wire value stays 24-hour', () => {
  it('reads a 24-hour value back as 12-hour for display', () => {
    expect(twelveHour('13:00')).toBe('01:00 PM');
    expect(twelveHour('09:05')).toBe('09:05 AM');
  });

  it('names midnight and noon the way a clock does, not 00', () => {
    expect(twelveHour('00:00')).toBe('12:00 AM');
    expect(twelveHour('12:00')).toBe('12:00 PM');
  });

  it('says nothing rather than guessing when there is no time', () => {
    expect(twelveHour('')).toBeNull();
    expect(twelveHour('banana')).toBeNull();
  });

  it('refuses a time that no clock has', () => {
    expect(twelveHour('24:00')).toBeNull();
    expect(twelveHour('10:75')).toBeNull();
  });
});

describe('round-tripping through the native picker', () => {
  it('hands the picker a Date carrying the stored time', () => {
    const at = clockToDate('16:45');

    expect(at?.getHours()).toBe(16);
    expect(at?.getMinutes()).toBe(45);
  });

  it('turns what the picker returns back into the 24-hour value the API takes', () => {
    const picked = new Date();
    picked.setHours(16, 45, 0, 0);

    expect(dateToClock(picked)).toBe('16:45');
  });

  it('pads, so 09:05 never leaves as 9:5', () => {
    const picked = new Date();
    picked.setHours(9, 5, 0, 0);

    expect(dateToClock(picked)).toBe('09:05');
  });

  it('survives the round trip for every hour of the day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const stored = `${String(hour).padStart(2, '0')}:30`;
      const at = clockToDate(stored);

      expect(at).not.toBeNull();
      expect(dateToClock(at as Date)).toBe(stored);
    }
  });
});
