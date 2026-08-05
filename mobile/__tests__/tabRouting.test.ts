import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { COMING_SOON_SURFACES } from '../src/components/comingSoonMessage';
import { tripRowDestination } from '../src/itineraries/TripRow';


const MOBILE_ROOT = join(__dirname, '..');
const APP = join(MOBILE_ROOT, 'app');
const TABS = join(APP, '(tabs)');
const TRIPS = join(TABS, 'itineraries');

const MOCK_CFAB_SIZE = 40;

function read(...parts: string[]): string {
  return readFileSync(join(...parts), 'utf8');
}

function tripScreens(): [string, string][] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name))
        : entry.name === '_layout.tsx'
          ? []
          : [join(dir, entry.name)],
    );

  return [...walk(TRIPS), ...walk(join(TABS, 'members'))].map((path) => [
    path.slice(TABS.length + 1).replace(/\\/g, '/'),
    readFileSync(path, 'utf8'),
  ]);
}

describe('the tab group is the navigation frame (S4.9 decision 12)', () => {
  it('has one file per tab, and the app opens on Trips because Trips is the index', () => {
    expect(readdirSync(TABS).sort()).toEqual(
      [
        '_layout.tsx',
        'create.tsx',
        'home.tsx',
        'index.tsx',
        'itineraries',
        'members',
        'profile.tsx',
        'published',
        'search.tsx',
      ].sort(),
    );
  });

  it('leaves no second Trips screen behind at the old route', () => {
    expect(existsSync(join(APP, 'index.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'me.tsx'))).toBe(false);
  });

  it('keeps the trip flow INSIDE the tab navigator, so the nav bar persists on every trip screen', () => {
    expect(existsSync(join(APP, 'itineraries'))).toBe(false);
    expect(existsSync(join(APP, 'members'))).toBe(false);
    expect(existsSync(join(TRIPS, '_layout.tsx'))).toBe(true);
  });

  it('hides them from the tab bar — a route group under Tabs becomes a tab unless href is null', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain('name="itineraries" options={{ href: null }}');
    expect(layout).toContain('name="members" options={{ href: null }}');
  });

  it('insets only the two bare tabs — the trip screens get theirs from ScreenHeader, and both would double up', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain('sceneStyle: bareScene(insets.top)');
    expect(layout.match(/bareScene\(insets\.top\)/g) ?? []).toHaveLength(2);
    expect(layout).not.toMatch(/screenOptions=\{\{[\s\S]*?paddingTop/);
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

  it('is four tabs with no centre button — the mock relocates creation to the Trips screen (S4.13)', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).not.toContain('CREATE_BUTTON_SIZE');
    expect(layout).not.toContain('createButton');
    expect(layout).toContain('name="create" options={{ href: null }}');
    expect(layout).toContain('height: TAB_BAR_HEIGHT + insets.bottom');
  });

  it('calls the second tab Discover — the feed it opens is the discovery axis (ADR-019)', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain("title: 'Discover'");
    expect(layout).not.toMatch(/title: 'Search'/);
  });

  it('greys Home and Discover rather than navigating to an empty screen', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain("comingSoon('home')");
    expect(layout).toContain("comingSoon('search')");
    expect(layout.match(/event\.preventDefault\(\)/g) ?? []).toHaveLength(2);
  });

  it('gives every tab a real icon — an unset one renders as a tofu box on Android', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout.match(/tabBarIcon:/g) ?? []).toHaveLength(4);
  });

  it('shows no navigator header anywhere — every heading is drawn as page content', () => {
    expect(read(TABS, '_layout.tsx')).toContain('headerShown: false');
    expect(read(TRIPS, '_layout.tsx')).toContain('headerShown: false');
  });

  const FULL_BLEED = ['itineraries/[id]/published.tsx'];

  it.each(tripScreens().filter(([name]) => !FULL_BLEED.includes(name)))(
    '%s draws its own heading — with no header bar, a navigator title renders nowhere',
    (_name, source) => {
      expect(source).toMatch(/<ScreenHeader/);
    },
  );

  it.each(tripScreens().filter(([name]) => FULL_BLEED.includes(name)))(
    '%s is exempt because the mock draws no header bar — so it must take the inset itself',
    (_name, source) => {
      expect(source).toMatch(/useSafeAreaInsets/);
      expect(source).toMatch(/paddingTop: insets\.top/);
    },
  );

  it.each(tripScreens())('%s sets no navigator title — a dead option that reads as a heading', (_name, source) => {
    expect(source).not.toMatch(/options=\{\{[^}]*title:/);
  });

  it('creates from the Trips screen, straight to trip details — the mock connector, not the chooser', () => {
    const trips = read(TABS, 'index.tsx');

    expect(trips).toContain('href="/itineraries/new"');
    expect(trips).toContain('Create Itinerary');
    expect(read(TABS, '_layout.tsx')).not.toContain("router.push('/itineraries/create')");
  });

  it('greys Add a Past Trip — the founder wants the argument before the door (S4.13)', () => {
    const trips = read(TABS, 'index.tsx');

    expect(trips).toContain('Add a Past Trip');
    expect(trips).toContain("comingSoon('addPastTrip')");
  });

  it('says Standouts and never Highlights — the glossary reserved that word for diaries', () => {
    for (const screen of [read(TRIPS, 'new.tsx'), read(TRIPS, '[id]', 'edit.tsx')]) {
      expect(screen).toContain('Standout');
      expect(screen).not.toMatch(/Highlight/);
    }
  });

  it('walks the day schedules to the preview, as the mock draws it', () => {
    const days = read(TRIPS, '[id]', 'days', 'index.tsx');

    expect(days).toContain('Preview Itinerary');
    expect(days).toContain("pathname: '/itineraries/[id]/preview'");
  });

  it('ends the creation walk on Finish Itinerary, on the preview, and only while draft', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');

    expect(preview).toContain('Finish Itinerary');
    expect(preview).toContain("finishPlanning.mutate('finish-planning'");
    expect(preview).toContain("state === 'draft'");
    expect(preview).not.toMatch(/Complete Itinerary/);
  });

  it('sends the preview back where it came from — Trips or the editor (founder, 2026-08-04)', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');
    const editor = read(TRIPS, '[id]', 'days', 'index.tsx');

    expect(preview).toContain("const cameFromEditor = from === 'days'");
    expect(preview).toMatch(/cameFromEditor[\s\S]{0,120}'\/itineraries\/\[id\]\/days'/);
    expect(preview).toMatch(/:\s*\{ pathname: '\/' \}/);
    expect(editor).toContain("from: 'days'");
  });

  it('makes Continue Editing OPEN the editor — not go back, which returns to wherever you came from', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');

    expect(preview).toMatch(/const continueEditing = \(\) =>\s*\n?\s*router\.navigate\(\{ pathname: '\/itineraries\/\[id\]\/days'/);
    expect(preview).not.toMatch(/continueEditing[\s\S]{0,120}router\.back\(\)/);
  });

  it('navigates rather than pushes across the whole flow, so back walks the stack in order', () => {
    for (const screen of [
      read(TRIPS, '[id]', 'preview.tsx'),
      read(TRIPS, '[id]', 'days', 'index.tsx'),
      read(TRIPS, '[id]', 'activity.tsx'),
    ]) {
      expect(screen).not.toMatch(/router\.push\(/);
    }
  });

  it('reserves the publish footer for a completed, unpublished trip — frame 7 is the publish act', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');

    expect(preview).toContain("state === 'completed' && trip.data?.published === false");
    expect(preview).toMatch(/readyToPublish \? \(/);
  });

  it('opens an unpublished trip on its preview, not the old workspace (founder, 2026-08-04)', () => {
    const row = read(MOBILE_ROOT, 'src', 'itineraries', 'TripRow.tsx');

    expect(row).toContain("pathname: '/itineraries/[id]/preview'");
    expect(row).toMatch(/if \(itinerary\.archived\)/);
  });

  it('shows honest zeros and "Est. Cost" on the published stats card (S4.13 decision 10)', () => {
    const view = read(MOBILE_ROOT, 'src', 'itineraries', 'PublishedItineraryView.tsx');

    expect(view).toContain('Est. Cost');
    expect(view).not.toMatch(/Est\. Total|\/Person/);
  });

  it('speaks the honest tense on the preview banner — nothing is published yet', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');

    expect(preview).toMatch(/what other travelers will see if you publish/);
    expect(preview).not.toMatch(/preview of your published itinerary/);
  });

  it('titles and labels the activity form as the frame draws it (S4.13 fidelity pass)', () => {
    const activity = read(TRIPS, '[id]', 'activity.tsx');

    expect(activity).toContain('title="Daily Activity"');
    expect(activity).toContain('label="Activity Name"');
    expect(activity).toContain('label="Estimated Cost"');
    expect(activity).toContain('Describe a specific place or landmark');
    expect(activity).toContain('Save Activity');
    expect(activity).toContain('Photos');
    expect(activity).not.toMatch(/label="Est\. cost"|Add Activity'|Edit Activity'/);
  });

  it('opens the booking card as a MODAL, not an inline expansion (founder, 2026-08-04)', () => {
    const activity = read(TRIPS, '[id]', 'activity.tsx');

    expect(activity).toContain('Add Booking Link / Option');
    expect(activity).toContain('setBookingOpen(true)');
    expect(activity).toMatch(/<Modal\s/);
    expect(activity).toContain('onRequestClose');
    expect(activity).toContain('styles.backdrop');
  });

  it('shows no edit attribution on activity cards — this is the create flow, not the workspace', () => {
    const editor = read(TRIPS, '[id]', 'days', 'index.tsx');

    expect(editor).not.toMatch(/attributionLine|styles\.attribution/);
  });

  it('draws the whole booking card the founder ruled in, one per activity', () => {
    const activity = read(TRIPS, '[id]', 'activity.tsx');

    expect(activity).toContain('Booking Purpose');
    expect(activity).toContain('Booking Provider');
    expect(activity).toContain('Target URL');
    expect(activity).toContain('Estimated Price');
    expect(activity).not.toMatch(/PROVIDER \d|Add another/);
  });

  it('the chooser offers scratch live and fork greyed', () => {
    const chooser = read(TRIPS, 'create.tsx');

    expect(chooser).toContain("router.replace('/itineraries/new')");
    expect(chooser).toContain("comingSoon('fork')");
    expect(chooser).toContain('Start from Scratch');
    expect(chooser).toContain('Fork an Existing Itinerary');
  });
});


describe('the create form asks for a duration, never dates (S4.9 decision 13)', () => {
  const create = read(TRIPS, 'new.tsx');

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


describe('the two day surfaces, each with its own job (founder ruling 2026-07-31)', () => {
  const DAYS = join(TRIPS, '[id]', 'days');

  it('has exactly two: the chips editor and the day detail', () => {
    expect(readdirSync(DAYS).sort()).toEqual(['[dayId].tsx', 'index.tsx']);
  });

  it('sends a workspace day card to the DETAIL screen, not the editor', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain("pathname: '/itineraries/[id]/days/[dayId]'");
    expect(workspace).toContain('dayId: day.id');
  });

  it('sends the create flow to the EDITOR, at Day 1 (decision 13)', () => {
    expect(read(TRIPS, 'new.tsx')).toContain("pathname: '/itineraries/[id]/days'");
    expect(read(TRIPS, 'new.tsx')).toContain("day: '1'");
  });

  it('opens a DRAFT straight in the day editor — there is nothing to preview yet', () => {
    const draft = tripRowDestination({ id: 'trip-1', archived: false, published: false, state: 'draft' });

    expect(draft.pathname).toBe('/itineraries/[id]/days');
  });

  it('routes on DISCOVERY: planned-but-unpublished to its preview, published to the overview', () => {
    for (const state of ['upcoming', 'ongoing', 'completed'] as const) {
      expect(
        tripRowDestination({ id: 'trip-1', archived: false, published: false, state }).pathname,
      ).toBe('/itineraries/[id]/preview');
    }
    expect(
      tripRowDestination({ id: 'trip-1', archived: false, published: true, state: 'completed' })
        .pathname,
    ).toBe('/published/[id]');
  });

  it('lets ARCHIVED win over everything — an archived trip has no public page, and no flow to rejoin', () => {
    expect(
      tripRowDestination({ id: 'trip-1', archived: true, published: true, state: 'completed' })
        .pathname,
    ).toBe('/itineraries/[id]');
    expect(
      tripRowDestination({ id: 'trip-1', archived: true, published: false, state: 'draft' }).pathname,
    ).toBe('/itineraries/[id]');
  });

  it('the activity form picks a time rather than asking anyone to type one', () => {
    const form = read(TRIPS, '[id]', 'activity.tsx');

    expect(form).toContain('<TimePicker');
    expect(form).not.toMatch(/Time \(24h\)/);
  });

  it('greys the history link on both, until S4.10', () => {
    expect(read(DAYS, 'index.tsx')).toContain("comingSoon('activityHistory')");
    expect(read(DAYS, '[dayId].tsx')).toContain("comingSoon('activityHistory')");
  });

  it('keeps building the plan on the editor: owner-only + chip, dashed Add Activity, kebab', () => {
    const editor = read(DAYS, 'index.tsx');

    expect(editor).toContain('{isOwner && <AddDayChip');
    expect(editor).toContain('<ActivityKebab');
    expect(editor).toContain('style={styles.addActivity}');
    expect(editor).toContain("borderStyle: 'dashed'");
    expect(editor).not.toMatch(/styles\.fab/);
  });

  it('keeps the detail screen to reading the day — no chips, no FAB, no day CRUD', () => {
    const detail = read(DAYS, '[dayId].tsx');

    expect(detail).not.toMatch(/AddDayChip|styles\.fab|Delete Day/);
    expect(detail).toContain('leaseNotice');
    expect(detail).toContain('attributionLine');
  });

  it('keeps the archived banner above the tabs — an archived trip explains itself first', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');
    const tabBarAt = workspace.indexOf('<View style={styles.tabBar}>');

    expect(workspace.indexOf('<TripArchiveBanner')).toBeLessThan(tabBarAt);
  });

  it('offers no way to archive from the UI — the control was pulled (founder, 08/01)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).not.toContain('ArchiveTripLink');
    expect(workspace).not.toContain('Archive trip');
  });

  it('reaches members through the roster row alone, not a second Details button (founder, 08/01)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');
    const detailsTabAt = workspace.indexOf('function DetailsTab');

    expect(workspace).not.toContain('ownership transfer');
    expect(workspace.indexOf("pathname: '/members/[itineraryId]'")).toBeLessThan(detailsTabAt);
  });

  it('reads the three axes through helpers, never by comparing them inline (ADR-019)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain('workspaceEyebrow(data)');
    expect(workspace).not.toMatch(/data\.visibility === '/);
    expect(workspace).not.toMatch(/data\.state === '/);
  });

  it('lets the publish CTA explain the complete gate rather than vanishing (ADR-019, AC 13)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain('canPublish(data)');
    expect(workspace).toContain('publishNeedsCompleteBody');
  });

  it('puts an Edit itinerary cogwheel on the workspace, pointing at the day editor (founder, 08/01)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');
    const headerEnds = workspace.indexOf('<View style={styles.identityRow}>');

    expect(workspace.slice(0, headerEnds)).toContain('accessibilityLabel="Edit itinerary"');
    expect(workspace.slice(0, headerEnds)).toContain("pathname: '/itineraries/[id]/days'");
    expect(workspace).toContain('isEditable(data) ? (');
  });

  it('puts publish on the workspace screen and unpublish quietly in the Details tab (S4.1 decision 11)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');
    const detailsTabAt = workspace.indexOf('function DetailsTab');

    expect(workspace.indexOf('Publish Itinerary')).toBeLessThan(detailsTabAt);
    expect(workspace.indexOf('Unpublish this trip')).toBeGreaterThan(detailsTabAt);
  });
});


describe('every greyed affordance is wired to the shared helper (register #2)', () => {
  const screens = [
    read(TABS, '_layout.tsx'),
    read(TABS, 'index.tsx'),
    read(TRIPS, 'new.tsx'),
    read(TRIPS, 'create.tsx'),
    read(TRIPS, '[id]', 'index.tsx'),
    read(TRIPS, '[id]', 'days', 'index.tsx'),
    read(TRIPS, '[id]', 'days', '[dayId].tsx'),
    read(TRIPS, '[id]', 'activity.tsx'),
    read(TRIPS, '[id]', 'invite.tsx'),
    read(MOBILE_ROOT, 'src', 'components', 'ComingSoonScreen.tsx'),
    read(MOBILE_ROOT, 'src', 'itineraries', 'PublishedItineraryView.tsx'),
  ].join('\n');

  it.each(Object.keys(COMING_SOON_SURFACES))('%s has a call site', (surface) => {
    expect(screens).toMatch(new RegExp(`['"]${surface}['"]`));
  });
});
