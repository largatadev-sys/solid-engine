import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { spacing } from '../src/theme/tokens';

const SRC = join(__dirname, '..', 'src');

const EXEMPT: Record<string, string> = {
  'discovery/FilterSheet.tsx': 'a Modal sheet — it covers the screen, so no tab bar was ever below it',
  'feed/NewPostsPill.tsx': 'a floating pill with no bottom anchor, and Home keeps its bar anyway',
};

const CLAMPS_ITS_OWN = ['feedback/FeedbackDock.tsx'];

function walk(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (name.endsWith('.tsx')) found.push(path);
  }
  return found;
}

function docked(): Array<{ rel: string; text: string }> {
  return walk(SRC)
    .map((path) => ({
      rel: path.slice(SRC.length + 1).split('\\').join('/'),
      text: readFileSync(path, 'utf8'),
    }))
    .filter(({ text }) => /^ {2}(dock|rail): \{/m.test(text));
}

describe('a docked surface clears the home indicator on its own', () => {
  it('finds the docked surfaces rather than trusting a list someone has to remember', () => {
    expect(docked().length).toBeGreaterThan(8);
  });

  it('every one either reads the safe area or is exempt with a reason', () => {
    const unguarded = docked()
      .filter(({ rel, text }) => !text.includes('useSafeAreaInsets') && EXEMPT[rel] === undefined)
      .map(({ rel }) => rel);

    expect(unguarded).toEqual([]);
  });

  it('the exemptions name real files, so the list cannot rot into a lie', () => {
    const seen = docked().map(({ rel }) => rel);

    Object.keys(EXEMPT).forEach((rel) => expect(seen).toContain(rel));
  });

  it('every dock padded inline spends the inset the way the app already does', () => {
    const inlinePadded = docked().filter(({ text }) =>
      /\[styles\.(dock|rail), \{/.test(text),
    );

    const spentElsewhere = inlinePadded
      .filter(({ text }) => !text.includes('insets.bottom + spacing.md'))
      .map(({ rel }) => rel)
      .filter((rel) => CLAMPS_ITS_OWN.every((own) => own !== rel));

    expect(inlinePadded.length).toBeGreaterThan(8);
    expect(spentElsewhere).toEqual([]);
    expect(spacing.md).toBe(16);
  });
});
