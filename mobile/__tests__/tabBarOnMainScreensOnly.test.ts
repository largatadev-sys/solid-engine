import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MAIN_SCREENS, showsTabBar } from '../src/navigation/tabBar';

describe('the tab bar belongs to the main screens and nowhere else', () => {
  it('shows on each of the four tab roots', () => {
    expect(MAIN_SCREENS).toEqual(['/', '/discover', '/trips', '/profile']);
    MAIN_SCREENS.forEach((route) => expect(showsTabBar(route)).toBe(true));
  });

  it('hides while a diary or a postcard is being read, which is what the rule was asked for', () => {
    expect(showsTabBar('/diaries/01a07-abc')).toBe(false);
    expect(showsTabBar('/postcards/01a07-def')).toBe(false);
    expect(showsTabBar('/feed/diary/01a07-abc')).toBe(false);
  });

  it('hides on anything pushed above a tab root, not only on the two named', () => {
    [
      '/diaries/new',
      '/diaries/01a07-abc/edit',
      '/postcards/new',
      '/postcards/01a07-def/edit',
      '/itineraries/01a07-ghi',
      '/itineraries/01a07-ghi/activity',
      '/account',
      '/showcase/01a07-jkl',
      '/discovery-results',
    ].forEach((route) => expect(showsTabBar(route)).toBe(false));
  });

  it('reads a trailing slash as the same screen, so the bar cannot flicker on one', () => {
    expect(showsTabBar('/trips/')).toBe(true);
    expect(showsTabBar('/')).toBe(true);
  });

  it('is what the layout actually asks, rather than a rule nothing consults', () => {
    const layout = readFileSync(join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(layout).toContain("import { showsTabBar } from '../../src/navigation/tabBar';");
    expect(layout).toContain('const onAMainScreen = showsTabBar(pathname);');
    expect(layout).toContain('tabBarStyle: onAMainScreen');
    expect(layout).toContain("display: 'none'");
  });
});
