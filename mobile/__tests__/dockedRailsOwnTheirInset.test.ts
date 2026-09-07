import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { memoryMetrics } from '../src/theme/memoryTokens';

const DIARY = join(__dirname, '..', 'src', 'diary');

const DOCKED = [
  'AddDayScreen',
  'DiaryDaysScreen',
  'EditDiaryScreen',
  'EditPostcardScreen',
  'NewDiaryScreen',
  'NewPostcardScreen',
  'PostcardOnDayScreen',
];

function source(name: string): string {
  return readFileSync(join(DIARY, `${name}.tsx`), 'utf8');
}

describe('a docked CTA clears the home indicator on its own', () => {
  it.each(DOCKED)('%s reads the safe area rather than trusting a bar below it', (name) => {
    expect(source(name)).toContain("from 'react-native-safe-area-context'");
    expect(source(name)).toContain('const insets = useSafeAreaInsets();');
  });

  it.each(DOCKED)('%s pads its rail by that inset', (name) => {
    expect(source(name)).toContain(
      'style={[styles.rail, { paddingBottom: insets.bottom + memoryMetrics.railFloor }]}',
    );
  });

  it('keeps the floor the rails already had, named once so the seven cannot drift', () => {
    expect(memoryMetrics.railFloor).toBe(16);
  });

  it('none of them still docks on a bare style, which is what the tab bar used to rescue', () => {
    DOCKED.forEach((name) => expect(source(name)).not.toContain('style={styles.rail}>'));
  });
});
