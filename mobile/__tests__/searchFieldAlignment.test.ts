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
    expect(field).toContain('paddingVertical: discoveryMetrics.searchFieldPadding');
  });

  it('seats every screen at the same height, so the bar never jumps between them', () => {
    const row = SHARED.slice(SHARED.indexOf('row: {'), SHARED.indexOf('back: {'));

    expect(row).toContain('paddingTop: spacing.sm3');
    expect(row).toContain('paddingBottom: spacing.sm2');
  });

  it('is the only definition — no screen builds its own field', () => {
    for (const screen of SCREENS) {
      const source = read('src', 'discovery', screen);

      expect(source).not.toContain('discoveryMetrics.searchBarPadding');
      expect(source).not.toContain('searchBar: {');
    }
  });

  it('draws its glyph from the shared constants, never a per-screen guess', () => {
    expect(SHARED).toContain('discoveryMetrics.searchFieldGlyph');
    expect(SHARED).toContain('discoveryMetrics.searchFieldGlyphFocused');

    expect(read('src', 'discovery', 'PeopleResultsScreen.tsx')).toContain(
      '<Icon name="search" size={SEARCH_GLYPH}',
    );
    expect(read('src', 'discovery', 'DiscoverySearchScreen.tsx')).toContain(
      '<Icon name="search" size={SEARCH_GLYPH_FOCUSED}',
    );
  });

  it('keeps the focused field the same HEIGHT as the resting one, which is what the extra padding buys', () => {
    const focused = SHARED.slice(SHARED.indexOf('focusedField: {'));

    expect(focused).toContain('borderWidth: 1.5');
    expect(focused).toContain('discoveryMetrics.searchFieldFocusedPadding');
  });

  it('gives the back chevron its own row, so the field starts at the same edge everywhere', () => {
    expect(SHARED).toContain('<View style={styles.row}>{children}</View>');
    expect(SHARED).toContain('styles.backRow');

    const fieldRow = SHARED.slice(
      SHARED.indexOf('<View style={styles.row}>'),
      SHARED.indexOf('export function SearchField('),
    );

    expect(fieldRow).not.toContain('styles.back');
  });

  it('gives Discover the title-and-glass header its sibling tabs use, not a bar of its own', () => {
    const landing = read('src', 'discovery', 'DiscoveryLandingScreen.tsx');

    expect(landing).toContain('DISCOVER_TITLE');
    expect(landing).toContain('discoveryMetrics.headerGlyph');
    expect(landing).not.toContain('<SearchField');
  });

  it('leaves the bar only on the screens a search is actually being run from', () => {
    const withBar = SCREENS.filter((screen) => {
      const source = read('src', 'discovery', screen);
      return source.includes('searchFieldStyles') || source.includes('<SearchField');
    });

    expect(withBar.sort()).toEqual(
      ['DiscoveryResultsScreen.tsx', 'DiscoverySearchScreen.tsx', 'PeopleResultsScreen.tsx'].sort(),
    );
  });

  it('opens every search bar with the same leading chevron, so both rows sit at one edge', () => {
    for (const screen of ['DiscoverySearchScreen.tsx', 'PeopleResultsScreen.tsx']) {
      expect(read('src', 'discovery', screen)).toContain('<SearchFieldRow onBack=');
    }
  });
});
