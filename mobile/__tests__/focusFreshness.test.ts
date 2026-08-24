import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

const HELPER = join('src', 'query', 'useRevalidateOnFocus.ts');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry.startsWith('.')) return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const SURFACES: ReadonlyArray<readonly [string, string]> = [
  ['Home', join('src', 'feed', 'FeedScreen.tsx')],
  ['Trips', join('app', '(tabs)', '(trips)', 'trips.tsx')],
  ['Discover', join('src', 'discovery', 'DiscoveryLandingScreen.tsx')],
  ['Profile', join('app', '(tabs)', '(profile)', 'profile.tsx')],
  ['the Profile itineraries pane', join('src', 'profile', 'ProfileItinerariesTab.tsx')],
  ['the Profile diary pane', join('src', 'profile', 'ProfileDiaryTab.tsx')],
  ['the poll board', join('src', 'query', 'pollQueries.ts')],
  ['the Travelers tab', join('src', 'itineraries', 'WorkspaceTravelersTab.tsx')],
];

describe('every surface that revalidates on focus goes through the one helper (S4.34 ticket 02)', () => {
  it.each(SURFACES)('%s reaches for the shared helper', (_name, file) => {
    expect(read(file)).toMatch(/useRevalidateOnFocus\(/);
  });

  it('nothing else hand-rolls useFocusEffect around a refetch', () => {
    const files = [
      ...sourceFiles(join(MOBILE_ROOT, 'app')),
      ...sourceFiles(join(MOBILE_ROOT, 'src')),
    ].filter((file) => !file.endsWith(HELPER));

    const twins = files.filter((file) =>
      /useFocusEffect\([\s\S]{0,200}?refetch\(\)/.test(readFileSync(file, 'utf8')),
    );

    expect(twins).toEqual([]);
  });
});

describe("Home's poll runs only while Home is being looked at (S4.34 ticket 02, AC 4)", () => {
  const SCREEN = read('src', 'feed', 'FeedScreen.tsx');

  it('starts the interval inside a focus effect rather than on mount', () => {
    expect(SCREEN).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*const tick = setInterval\(/);
  });

  it('clears the interval when focus leaves, so a blurred screen issues nothing', () => {
    expect(SCREEN).toMatch(/return \(\) => clearInterval\(tick\);/);
  });

  it('leaves the poll interval and the pill exactly as they were', () => {
    expect(read('src', 'feed', 'freshPosts.ts')).toMatch(/POLL_MS = 60_000/);
    expect(SCREEN).toMatch(/showsPill\(fresh, scrolledDown\) && <NewPostsPill/);
  });
});

describe('the bounded-staleness window is untouched (S4.34)', () => {
  it('still stales at 30 seconds — the story adds a trigger, not a shorter fuse', () => {
    expect(read('src', 'query', 'queryClient.ts')).toMatch(/staleTime: 30_000/);
  });
});
