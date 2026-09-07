import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIARY = join(__dirname, '..', 'src', 'diary');

const ANIMATED = ['MemorySheet.tsx', 'MemoryToast.tsx', 'PhotoTiles.tsx'];

function source(file: string): string {
  return readFileSync(join(DIARY, file), 'utf8');
}

function durations(text: string): string[] {
  return text.match(/duration:.*/g) ?? [];
}

describe('the memory primitives honour Reduce Motion, as the Diary tab already did', () => {
  it.each(ANIMATED)('%s reads the traveler setting', (file) => {
    expect(source(file)).toContain("from '../components/useReducedMotion'");
    expect(source(file)).toContain('const reducedMotion = useReducedMotion();');
  });

  it.each(ANIMATED)('%s guards every duration it animates', (file) => {
    const found = durations(source(file));

    expect(found.length).toBeGreaterThan(0);
    found.forEach((line) => expect(line).toContain('reducedMotion'));
  });

  it.each(ANIMATED)('%s re-runs when the setting changes, or it would latch', (file) => {
    const deps = source(file).match(/\}, \[[^\]]*\]\);/g) ?? [];

    expect(deps.some((list) => list.includes('reducedMotion'))).toBe(true);
  });

  it('MemoryConfirm drops its modal fade, which is the only motion it owns', () => {
    const text = source('MemoryConfirm.tsx');

    expect(text).toContain("animationType={reducedMotion ? 'none' : 'fade'}");
    expect(durations(text)).toHaveLength(0);
  });

  it('DiaryDaysScreen animates nothing of its own, so the toast is what carries it', () => {
    const text = source('DiaryDaysScreen.tsx');

    expect(text).not.toContain('Animated.');
    expect(text).toContain('showMemoryToast');
  });
});
