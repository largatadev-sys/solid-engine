import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { COMING_SOON_SURFACES } from '../src/components/comingSoonMessage';


const MOBILE_ROOT = join(__dirname, '..');
const APP = join(MOBILE_ROOT, 'app');
const TABS = join(APP, '(tabs)');

function read(...parts: string[]): string {
  return readFileSync(join(...parts), 'utf8');
}

describe('the tab group is the navigation frame (S4.9 decision 12)', () => {
  it('has one file per tab, and the app opens on Trips because Trips is the index', () => {
    expect(readdirSync(TABS).sort()).toEqual(
      ['_layout.tsx', 'create.tsx', 'home.tsx', 'index.tsx', 'profile.tsx', 'search.tsx'].sort(),
    );
  });

  it('leaves no second Trips screen behind at the old route', () => {
    expect(existsSync(join(APP, 'index.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'me.tsx'))).toBe(false);
  });

  it('declares every tab in the layout', () => {
    const layout = read(TABS, '_layout.tsx');

    for (const name of ['home', 'search', 'create', 'index', 'profile']) {
      expect(layout).toContain(`name="${name}"`);
    }
  });

  it('lets the layout own the tab labels — a screen-level title silently overrides them', () => {
    for (const screen of ['index.tsx', 'profile.tsx', 'home.tsx', 'search.tsx', 'create.tsx']) {
      expect(read(TABS, screen)).not.toMatch(/<Stack\.Screen/);
    }
  });

  it('greys Home and Search rather than navigating to an empty screen', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain("comingSoon('home')");
    expect(layout).toContain("comingSoon('search')");
    expect(layout.match(/event\.preventDefault\(\)/g) ?? []).toHaveLength(3);
  });

  it('gives every tab a real icon — an unset one renders as a tofu box on Android', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout.match(/tabBarIcon:/g) ?? []).toHaveLength(5);
  });

  it('insets the tab scenes, because no tab screen has a header to do it for them', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain('headerShown: false');
    expect(layout).toContain('paddingTop: insets.top');
  });

  it('routes + straight to Trip Details — no chooser until S4.7 (decision 13)', () => {
    expect(read(TABS, '_layout.tsx')).toContain("router.push('/itineraries/new')");
    expect(read(TABS, 'create.tsx')).toContain('href="/itineraries/new"');
  });
});


describe('the create form asks for a duration, never dates (S4.9 decision 13)', () => {
  const create = read(APP, 'itineraries', 'new.tsx');

  it('has no date picker', () => {
    expect(create).not.toMatch(/DatePicker/);
    expect(create).not.toMatch(/startDate|endDate/);
  });

  it('takes a single free-text destination and never says "Search"', () => {
    expect(create).toContain('label="Destination"');
    expect(create).toContain('destinations: [destination.trim()]');
    expect(create).not.toMatch(/placeholder="Search/);
  });

  it('greys the cover drop-zone through the shared helper', () => {
    expect(create).toContain('surface="coverPhoto"');
  });

  it('lands Continue on the day editor at Day 1', () => {
    expect(create).toContain("pathname: '/itineraries/[id]/days'");
    expect(create).toContain("day: '1'");
    expect(create).toContain('Continue');
  });
});


describe('one day surface remains in the tree, entered by both doors (S4.9 decision 9)', () => {
  it('the chips editor is the only day screen', () => {
    const dayScreens = readdirSync(join(APP, 'itineraries', '[id]')).filter((file) =>
      /^(day|days|schedule)/i.test(file),
    );

    expect(dayScreens).toEqual(['days.tsx']);
  });

  it('the workspace day cards and the create flow both land on it', () => {
    expect(read(APP, 'itineraries', '[id]', 'index.tsx')).toContain("pathname: '/itineraries/[id]/days'");
    expect(read(APP, 'itineraries', 'new.tsx')).toContain("pathname: '/itineraries/[id]/days'");
  });

  it('greys the history link until S4.10', () => {
    expect(read(APP, 'itineraries', '[id]', 'days.tsx')).toContain("comingSoon('activityHistory')");
  });

  it('renders the "+" day chip for the owner only (decision 3, interim)', () => {
    expect(read(APP, 'itineraries', '[id]', 'days.tsx')).toContain('{isOwner && <AddDayChip');
  });

  it('adds activities from a FAB every member sees, and edits/deletes from a kebab', () => {
    const surface = read(APP, 'itineraries', '[id]', 'days.tsx');

    expect(surface).toContain('style={styles.fab}');
    expect(surface).toContain('<ActivityKebab');
    expect(surface).not.toMatch(/\{isOwner && [^}]*fab/);
  });

  it('carries the archive link on the Details tab, with the archived banner above the tabs', () => {
    const workspace = read(APP, 'itineraries', '[id]', 'index.tsx');
    const detailsTabAt = workspace.indexOf('function DetailsTab');
    const tabBarAt = workspace.indexOf('<View style={styles.tabBar}>');

    expect(workspace.indexOf('<TripArchiveBanner')).toBeLessThan(tabBarAt);
    expect(workspace.indexOf('<ArchiveTripLink')).toBeGreaterThan(detailsTabAt);
  });

  it('leaves the published eyebrow variant to S4.1 (decision 8)', () => {
    const workspace = read(APP, 'itineraries', '[id]', 'index.tsx');

    expect(workspace).toContain("data.visibility === 'private'");
    expect(workspace).not.toMatch(/visibility\.toUpperCase/);
  });
});


describe('every greyed affordance S4.9 ships is wired to the shared helper (register #2)', () => {
  const screens = [
    read(TABS, '_layout.tsx'),
    read(APP, 'itineraries', 'new.tsx'),
    read(APP, 'itineraries', '[id]', 'index.tsx'),
    read(APP, 'itineraries', '[id]', 'days.tsx'),
    read(APP, 'itineraries', '[id]', 'activity.tsx'),
    read(APP, 'itineraries', '[id]', 'invite.tsx'),
    read(MOBILE_ROOT, 'src', 'components', 'ComingSoonScreen.tsx'),
  ].join('\n');

  it.each(Object.keys(COMING_SOON_SURFACES))('%s has a call site', (surface) => {
    expect(screens).toMatch(new RegExp(`['"]${surface}['"]`));
  });
});
