import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const SHARED = read('src', 'discovery', 'SearchField.tsx');

const SCREENS = [
  'DiscoveryLandingScreen.tsx',
  'DiscoveryResultsScreen.tsx',
  'DiscoverySearchScreen.tsx',
  'PeopleResultsScreen.tsx',
] as const;


describe('the search bar holds still across discovery (S4.37)', () => {
  it('carries the canvas geometry in one place — gap 12, padding 12/16', () => {
    const field = SHARED.slice(SHARED.indexOf('field: {'), SHARED.indexOf('text: {'));

    expect(field).toContain('gap: spacing.sm3');
    expect(field).toContain('paddingHorizontal: spacing.md');
    expect(field).toContain('paddingVertical: spacing.sm3');
  });

  it('seats every screen at the same height, so the bar never jumps between them', () => {
    const row = SHARED.slice(SHARED.indexOf('row: {'), SHARED.indexOf('back: {'));

    expect(row).toContain('paddingTop: spacing.sm3');
    expect(row).toContain('paddingBottom: spacing.sm2');
  });

  it('is the only definition — no screen builds its own field', () => {
    for (const screen of SCREENS) {
      const source = read('src', 'discovery', screen);

      expect(source.includes('searchFieldStyles') || source.includes('<SearchField')).toBe(true);
      expect(source).not.toContain('discoveryMetrics.searchBarPadding');
      expect(source).not.toContain('searchBar: {');
    }
  });

  it('draws one glyph size in the field, never a per-screen guess', () => {
    expect(SHARED).toContain('export const SEARCH_GLYPH = 16');

    for (const screen of ['DiscoverySearchScreen.tsx', 'PeopleResultsScreen.tsx']) {
      const source = read('src', 'discovery', screen);

      expect(source).toContain('<Icon name="search" size={SEARCH_GLYPH}');
    }
  });
});
