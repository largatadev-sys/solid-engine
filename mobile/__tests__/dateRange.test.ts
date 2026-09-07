import {
  dayCountOf,
  emptyRange,
  isComplete,
  isEdgeOf,
  isInTheFuture,
  isOutsideBounds,
  isWithin,
  monthGridOf,
  tapped,
} from '../src/diary/dateRange';


describe('the diary date range', () => {

  it('takes the first tap as the start and leaves the end open', () => {
    expect(tapped(emptyRange, '2026-03-15')).toEqual({ start: '2026-03-15', end: null });
  });


  it('takes the second tap as the end', () => {
    const started = tapped(emptyRange, '2026-03-15');

    expect(tapped(started, '2026-03-20')).toEqual({ start: '2026-03-15', end: '2026-03-20' });
  });


  it('restarts the range when the second tap lands on or before the start', () => {
    const started = tapped(emptyRange, '2026-03-15');

    expect(tapped(started, '2026-03-15')).toEqual({ start: '2026-03-15', end: null });
    expect(tapped(started, '2026-03-12')).toEqual({ start: '2026-03-12', end: null });
  });


  it('restarts once a complete range is tapped again', () => {
    const complete = { start: '2026-03-15', end: '2026-03-20' };

    expect(tapped(complete, '2026-04-02')).toEqual({ start: '2026-04-02', end: null });
  });


  it('sets both ends at once in single-date mode', () => {
    expect(tapped(emptyRange, '2026-03-16', 'single')).toEqual({
      start: '2026-03-16',
      end: '2026-03-16',
    });
  });


  it('counts the days inclusively, which is what the summary line reads', () => {
    expect(dayCountOf(emptyRange)).toBe(0);
    expect(dayCountOf({ start: '2026-03-15', end: null })).toBe(1);
    expect(dayCountOf({ start: '2026-03-15', end: '2026-03-15' })).toBe(1);
    expect(dayCountOf({ start: '2026-03-15', end: '2026-03-20' })).toBe(6);
  });


  it('counts across a month boundary and across a leap day', () => {
    expect(dayCountOf({ start: '2026-03-30', end: '2026-04-02' })).toBe(4);
    expect(dayCountOf({ start: '2028-02-27', end: '2028-03-01' })).toBe(4);
  });


  it('knows a complete range from a half-open one', () => {
    expect(isComplete(emptyRange)).toBe(false);
    expect(isComplete({ start: '2026-03-15', end: null })).toBe(false);
    expect(isComplete({ start: '2026-03-15', end: '2026-03-20' })).toBe(true);
  });


  it('paints the days between the ends, and the ends themselves', () => {
    const range = { start: '2026-03-15', end: '2026-03-20' };

    expect(isWithin(range, '2026-03-17')).toBe(true);
    expect(isWithin(range, '2026-03-21')).toBe(false);
    expect(isWithin({ start: '2026-03-15', end: null }, '2026-03-17')).toBe(false);
    expect(isEdgeOf(range, '2026-03-15')).toBe(true);
    expect(isEdgeOf(range, '2026-03-20')).toBe(true);
    expect(isEdgeOf(range, '2026-03-17')).toBe(false);
  });


  it('disables future dates, because a diary is a past trip', () => {
    expect(isInTheFuture('2026-03-21', '2026-03-20')).toBe(true);
    expect(isInTheFuture('2026-03-20', '2026-03-20')).toBe(false);
  });


  it('pads the month grid so the first lands under its weekday', () => {
    const march = monthGridOf(2026, 2);
    const april = monthGridOf(2026, 3);

    expect(march[0]).toBe('2026-03-01');
    expect(march.filter((day) => day !== null)).toHaveLength(31);
    expect(march.at(-1)).toBe('2026-03-31');

    expect(april.slice(0, 3)).toEqual([null, null, null]);
    expect(april[3]).toBe('2026-04-01');
  });


  it('pads February of a leap year correctly', () => {
    const february = monthGridOf(2028, 1);

    expect(february.filter((day) => day !== null)).toHaveLength(29);
    expect(february.at(-1)).toBe('2028-02-29');
  });
});

describe('a day can only be added inside the diary it belongs to', () => {
  const diary = { start: '2026-03-15', end: '2026-03-19' };

  it('admits the first and last day of the diary', () => {
    expect(isOutsideBounds('2026-03-15', diary)).toBe(false);
    expect(isOutsideBounds('2026-03-19', diary)).toBe(false);
  });

  it('refuses a day before it and a day after it', () => {
    expect(isOutsideBounds('2026-03-14', diary)).toBe(true);
    expect(isOutsideBounds('2026-03-20', diary)).toBe(true);
  });

  it('bounds nothing when there are none, so every other calendar is unchanged', () => {
    expect(isOutsideBounds('2026-03-14', undefined)).toBe(false);
    expect(isOutsideBounds('2026-03-14', { start: null, end: null })).toBe(false);
    expect(isOutsideBounds('2026-03-14', { start: '2026-03-15', end: null })).toBe(false);
  });
});
