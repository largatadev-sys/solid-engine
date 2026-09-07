import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { landingOffsetOf } from '../src/diary/dayLanding';

const MOBILE = join(__dirname, '..');

function source(...parts: string[]): string {
  return readFileSync(join(MOBILE, ...parts), 'utf8');
}

describe('where a diary lands when a postcard sends you to its day', () => {
  const tops = { 'day-1': 0, 'day-2': 240, 'day-3': 520 };

  it('adds the day block offset to where the day list itself begins', () => {
    expect(landingOffsetOf('day-2', tops, 380)).toBe(620);
  });

  it('lands at the list itself for the first day, not at the top of the page', () => {
    expect(landingOffsetOf('day-1', tops, 380)).toBe(380);
  });

  it('waits rather than guessing while the list has not been measured', () => {
    expect(landingOffsetOf('day-2', tops, null)).toBeNull();
  });

  it('waits rather than guessing while that day has not been measured', () => {
    expect(landingOffsetOf('day-9', tops, 380)).toBeNull();
  });

  it('has nowhere to land when the postcard is loose', () => {
    expect(landingOffsetOf(null, tops, 380)).toBeNull();
  });
});

describe('the screen wires that landing up', () => {
  const screen = source('src', 'diary', 'DiaryDetailScreen.tsx');

  it('measures the day list as well as each day, or the offset is short by the cover', () => {
    expect(screen).toContain('onLayout={(event) => setDaysTop(event.nativeEvent.layout.y)}');
    expect(screen).toContain('onMeasured={(top) =>');
  });

  it('lands once, so a later render never drags the reader back', () => {
    expect(screen).toContain('if (landed || landingOffset === null) return;');
    expect(screen).toContain('setLanded(true);');
  });

  it('scrolls rather than jumping, and holds still when the traveler asked for less motion', () => {
    expect(screen).toContain('scrollTo({ y: landingOffset, animated: !reducedMotion })');
  });

  it('the postcard hands over its day, and omits it when the postcard is loose', () => {
    const route = source('app', '(tabs)', '(profile)', 'postcards', '[id]', 'index.tsx');

    expect(route).toContain('day: postcard.data?.diaryDayId as string');
  });

  it('the diary route reads the day off the URL', () => {
    const route = source('app', '(tabs)', '(profile)', 'diaries', '[id]', 'index.tsx');

    expect(route).toContain('const { id, day } = useLocalSearchParams');
    expect(route).toContain('landOnDayId={day ?? null}');
  });
});
