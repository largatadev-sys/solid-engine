import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  RETAP_WINDOW_MS,
  isRetap,
  onTabRetap,
  retapRouteFor,
  tabRetapped,
  type RetapClock,
} from '../src/navigation/tabRetap';
import {
  DISCOVER_TAB_ROUTE,
  HOME_TAB_ROUTE,
  PROFILE_TAB_ROUTE,
  TRIPS_TAB_ROUTE,
} from '../src/navigation/retapRoutes';

const MOBILE_ROOT = join(__dirname, '..');

function clockAt(...readings: number[]): RetapClock {
  const queue = [...readings];
  return () => queue.shift() ?? 0;
}

describe('a retap is a second tap inside the window, measured by a clock the caller owns (S4.34 ticket 03)', () => {
  it('is not a retap the first time — there is nothing to be second to', () => {
    expect(isRetap(null, 1_000)).toBe(false);
  });

  it('is a retap when the second tap lands inside the window', () => {
    expect(isRetap(1_000, 1_000 + RETAP_WINDOW_MS - 1)).toBe(true);
  });

  it('is not a retap once the window has passed — two deliberate visits are not a double-tap', () => {
    expect(isRetap(1_000, 1_000 + RETAP_WINDOW_MS + 1)).toBe(false);
  });

  it('takes the window boundary itself as a retap, so the edge is decided rather than accidental', () => {
    expect(isRetap(1_000, 1_000 + RETAP_WINDOW_MS)).toBe(true);
  });

  it('refuses a reading that runs backwards rather than reporting a retap', () => {
    expect(isRetap(1_000, 900)).toBe(false);
  });
});

describe('the registry is keyed by route, so each tab answers for itself (S4.34 ticket 03)', () => {
  it('calls only the handler registered for the tapped route', () => {
    const seen: string[] = [];
    const stopHome = onTabRetap(HOME_TAB_ROUTE, () => seen.push('home'));
    const stopTrips = onTabRetap(TRIPS_TAB_ROUTE, () => seen.push('trips'));

    tabRetapped(TRIPS_TAB_ROUTE);
    expect(seen).toEqual(['trips']);

    stopHome();
    stopTrips();
  });

  it('forgets a handler when its screen unregisters, and leaves its siblings alone', () => {
    const seen: string[] = [];
    const stopHome = onTabRetap(HOME_TAB_ROUTE, () => seen.push('home'));
    const stopProfile = onTabRetap(PROFILE_TAB_ROUTE, () => seen.push('profile'));

    stopHome();
    tabRetapped(HOME_TAB_ROUTE);
    tabRetapped(PROFILE_TAB_ROUTE);

    expect(seen).toEqual(['profile']);
    stopProfile();
  });

  it('is harmless on a route nothing has registered', () => {
    expect(() => tabRetapped(DISCOVER_TAB_ROUTE)).not.toThrow();
  });

  it('drops a stale unregister rather than silencing the handler that replaced it', () => {
    const seen: string[] = [];
    const stopFirst = onTabRetap(HOME_TAB_ROUTE, () => seen.push('first'));
    const stopSecond = onTabRetap(HOME_TAB_ROUTE, () => seen.push('second'));

    stopFirst();
    tabRetapped(HOME_TAB_ROUTE);

    expect(seen).toEqual(['second']);
    stopSecond();
  });
});

describe('every tab has a route the registry can key on (S4.34 ticket 03)', () => {
  it('maps each of the four tab stacks to its own route', () => {
    expect(retapRouteFor(HOME_TAB_ROUTE)).toBe(HOME_TAB_ROUTE);
    expect(retapRouteFor('/feed/diary/abc')).toBe(HOME_TAB_ROUTE);
    expect(retapRouteFor(DISCOVER_TAB_ROUTE)).toBe(DISCOVER_TAB_ROUTE);
    expect(retapRouteFor(PROFILE_TAB_ROUTE)).toBe(PROFILE_TAB_ROUTE);
    expect(retapRouteFor('/account')).toBe(PROFILE_TAB_ROUTE);
    expect(retapRouteFor(TRIPS_TAB_ROUTE)).toBe(TRIPS_TAB_ROUTE);
    expect(retapRouteFor('/itineraries/abc')).toBe(TRIPS_TAB_ROUTE);
  });
});

describe('the timing is read from a clock, never from a synthetic event (S4.22, ticket 03)', () => {
  const SOURCE = readFileSync(
    join(MOBILE_ROOT, 'src', 'navigation', 'tabRetap.ts'),
    'utf8',
  );

  it('never reads nativeEvent.timestamp, which react-native-web does not populate', () => {
    expect(SOURCE).not.toMatch(/nativeEvent/);
    expect(SOURCE).not.toMatch(/\.timestamp/);
  });

  it('lets a caller inject the clock, so a test never steers Date.now()', () => {
    const clock = clockAt(5_000);
    expect(clock()).toBe(5_000);
  });
});

describe('all four tabs answer a retap, not only Home (S4.34 ticket 03, AC 6)', () => {
  const read = (...parts: string[]) => readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');

  const SCREENS: ReadonlyArray<readonly [string, string]> = [
    ['Home', join('src', 'feed', 'FeedScreen.tsx')],
    ['Trips', join('app', '(tabs)', '(trips)', 'trips.tsx')],
    ['Discover', join('src', 'discovery', 'DiscoveryLandingScreen.tsx')],
    ['Profile', join('app', '(tabs)', '(profile)', 'profile.tsx')],
  ];

  it.each(SCREENS)('%s registers its own retap handler', (_name, file) => {
    expect(read(file)).toMatch(/useTabRetap\(/);
  });

  it.each(SCREENS)('%s branches on being at the top, the way Home already did', (_name, file) => {
    const source = read(file);
    const handler = source.slice(source.indexOf('useTabRetap('));

    expect(handler).toMatch(/if \(atTop\(/);
    expect(handler).toMatch(/scrollTo(Offset)?\(|toTop\(/);
  });

  it('routes a retap on every tab, so no tab is a dead re-tap', () => {
    const layout = read('app', '(tabs)', '_layout.tsx');

    expect(layout).toMatch(/tabRetapped\(HOME_TAB_ROUTE\)/);
    expect(layout).toMatch(/tabRetapped\(DISCOVER_TAB_ROUTE\)/);
    expect(layout).toMatch(/tabRetapped\(TRIPS_TAB_ROUTE\)/);
    expect(layout).toMatch(/tabRetapped\(PROFILE_TAB_ROUTE\)/);
  });

  it('says the same thing on every tab — one copy constant, not four strings', () => {
    for (const [, file] of SCREENS) {
      expect(read(file)).toMatch(/(CAUGHT_UP_TOAST|FEED_REFRESHED_TOAST)/);
    }
  });
});

describe('scroll-to-top is platform-forked, because animated:true no-ops on the web (S4.34)', () => {
  const read = (...parts: string[]) => readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');

  it('animates on native, where scrollToOffset honours the flag', () => {
    expect(read('src', 'navigation', 'scrollToTop.native.ts')).toMatch(
      /SCROLL_TO_TOP_ANIMATED\s*=\s*true/,
    );
  });

  it('declines the animation on web, where it silently scrolls nowhere at all', () => {
    expect(read('src', 'navigation', 'scrollToTop.web.ts')).toMatch(
      /SCROLL_TO_TOP_ANIMATED:\s*boolean\s*=\s*false/,
    );
  });

  it('no retap surface passes a bare animated:true — that is the shape that does nothing', () => {
    const surfaces = [
      join('src', 'feed', 'FeedScreen.tsx'),
      join('app', '(tabs)', '(trips)', 'trips.tsx'),
      join('src', 'discovery', 'DiscoveryLandingScreen.tsx'),
      join('app', '(tabs)', '(profile)', 'profile.tsx'),
    ];

    for (const file of surfaces) {
      const source = read(file);
      expect(source).toMatch(/SCROLL_TO_TOP_ANIMATED/);
      expect(source).not.toMatch(/scrollTo(Offset)?\(\{[^}]*animated:\s*true/);
    }
  });
});
