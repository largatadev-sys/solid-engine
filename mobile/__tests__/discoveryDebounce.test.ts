import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const SEARCH = read('src', 'discovery', 'DiscoverySearchScreen.tsx');
const SHEET = read('src', 'discovery', 'FilterSheet.tsx');
const QUERIES = read('src', 'query', 'discoveryQueries.ts');
const RESULTS = read('src', 'discovery', 'DiscoveryResultsScreen.tsx');


describe('the debounce is wired to the calls it exists to slow down', () => {
  it('delays the suggestions query rather than every keystroke reaching the server', () => {
    expect(SEARCH).toContain('useDebounced(typed, SEARCH_DEBOUNCE_MS)');
  });

  it('delays the sheet-s live count, which fires on every draft edit', () => {
    expect(SHEET).toContain('useDebounced(');
    expect(SHEET).toContain('SEARCH_DEBOUNCE_MS');
  });

  it('never passes staleTime off as a debounce — it dedupes a key, it does not delay a new one', () => {
    expect(QUERIES).not.toContain('staleTime: SEARCH_DEBOUNCE_MS');
  });
});


describe('the results count is the number of MATCHES, not the number loaded so far', () => {
  it('asks the count endpoint rather than measuring the page it happens to hold', () => {
    expect(RESULTS).toContain('useDiscoveryCount(');
    expect(RESULTS).not.toContain('resultCountLine(cards.length)');
  });

  it('keeps the filters referentially stable, or the sheet-s draft resets under the traveler', () => {
    expect(RESULTS).toContain('useMemo(');
  });
});
