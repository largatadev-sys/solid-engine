import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { onTabRetap, tabRetapped } from '../src/navigation/tabRetap';
import {
  DISCOVER_TAB_ROUTE,
  HOME_TAB_ROUTE,
  PROFILE_TAB_ROUTE,
  TRIPS_TAB_ROUTE,
} from '../src/navigation/retapRoutes';

const MOBILE_ROOT = join(__dirname, '..');

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

describe('the retap needs no event timing at all (S4.22, ticket 03)', () => {
  const REGISTRY = readFileSync(
    join(MOBILE_ROOT, 'src', 'navigation', 'tabRetap.ts'),
    'utf8',
  );
  const TAB_BAR = readFileSync(
    join(MOBILE_ROOT, 'app', '(tabs)', '_layout.tsx'),
    'utf8',
  );

  it('decides a retap from the route the traveler is standing on, not from a tap window', () => {
    expect(TAB_BAR).toMatch(/inHomeStack\(pathname\)/);
    expect(TAB_BAR).toMatch(/pathname === TRIPS_TAB_ROUTE/);
  });

  it('reads no synthetic-event timing, which react-native-web does not populate', () => {
    for (const source of [REGISTRY, TAB_BAR]) {
      expect(source).not.toMatch(/nativeEvent/);
      expect(source).not.toMatch(/\.timestamp/);
    }
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
      expect(read(file)).toMatch(/CAUGHT_UP_TOAST/);
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

  it('forks only what differs — the scroll throttle keeps one definition', () => {
    for (const fork of ['scrollToTop.native.ts', 'scrollToTop.web.ts']) {
      expect(read('src', 'navigation', fork)).not.toMatch(/RETAP_SCROLL_THROTTLE_MS/);
    }
    expect(read('src', 'navigation', 'retapScroll.ts')).toMatch(
      /RETAP_SCROLL_THROTTLE_MS\s*=\s*\d+/,
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
