import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE = join(__dirname, '..');

function source(...parts: string[]): string {
  return readFileSync(join(MOBILE, ...parts), 'utf8');
}

describe('a diary opened from a postcard lands on that day', () => {
  const screen = source('src', 'diary', 'DiaryDetailScreen.tsx');

  it('measures each day rather than assuming a fixed block height', () => {
    expect(screen).toContain('onLayout={(event) => onMeasured(event.nativeEvent.layout.y)}');
    expect(screen).toContain('tops.current[day.id] = top;');
  });

  it('scrolls rather than jumping, which is what shows the traveler they moved', () => {
    expect(screen).toContain('scrollTo({ y: top, animated: true })');
  });

  it('lands once, so a later re-render never drags the reader back', () => {
    expect(screen).toContain('if (landed || landOnDayId === null) return undefined;');
    expect(screen).toContain('setLanded(true);');
  });

  it('waits for the day to be measured instead of scrolling to nowhere', () => {
    expect(screen).toContain('if (top === undefined) return undefined;');
  });

  it('the postcard hands over its day, and omits it when the postcard is loose', () => {
    const route = source('app', '(tabs)', '(profile)', 'postcards', '[id]', 'index.tsx');

    expect(route).toContain('postcard.data?.diaryDayId === null');
    expect(route).toContain('day: postcard.data?.diaryDayId as string');
  });

  it('the diary route reads the day off the URL', () => {
    const route = source('app', '(tabs)', '(profile)', 'diaries', '[id]', 'index.tsx');

    expect(route).toContain('const { id, day } = useLocalSearchParams');
    expect(route).toContain('landOnDayId={day ?? null}');
  });
});
