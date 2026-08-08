import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { COMING_SOON_SURFACES } from '../src/components/comingSoonMessage';
import { tripRowDestination } from '../src/itineraries/TripRow';


const MOBILE_ROOT = join(__dirname, '..');
const APP = join(MOBILE_ROOT, 'app');
const TABS = join(APP, '(tabs)');
const TRIPS_GROUP = join(TABS, '(trips)');
const TRIPS = join(TRIPS_GROUP, 'itineraries');

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

  return [...walk(TRIPS), ...walk(join(TRIPS_GROUP, 'members'))].map((path) => [
    path.slice(TRIPS_GROUP.length + 1).replace(/\\/g, '/'),
    readFileSync(path, 'utf8'),
  ]);
}

describe('the tab group is the navigation frame (S4.9 decision 12)', () => {
  it('has one file per tab, and the trip flow is a single group rather than four sibling tabs', () => {
    expect(readdirSync(TABS).sort()).toEqual(
      ['_layout.tsx', '(trips)', 'home.tsx', 'profile.tsx', 'search.tsx'].sort(),
    );
  });

  it('leaves no second Trips screen behind at the old route', () => {
    expect(existsSync(join(APP, 'index.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'me.tsx'))).toBe(false);
  });

  it('keeps the trip flow INSIDE the tab navigator, so the nav bar persists on every trip screen', () => {
    expect(existsSync(join(APP, 'itineraries'))).toBe(false);
    expect(existsSync(join(APP, 'members'))).toBe(false);
    expect(existsSync(join(TRIPS_GROUP, '_layout.tsx'))).toBe(true);
  });

  it('roots the trip stack at Trips, so back always unwinds the way the traveler walked in', () => {
    expect(existsSync(join(TRIPS_GROUP, 'index.tsx'))).toBe(true);
    expect(read(TRIPS_GROUP, '_layout.tsx')).toContain('<Stack');
  });

  it('nests no second stack under the trip stack, which is what stranded back on a sibling', () => {
    for (const nested of ['itineraries', 'members', 'published']) {
      expect(existsSync(join(TRIPS_GROUP, nested, '_layout.tsx'))).toBe(false);
    }
  });

  it('needs no href:null hiding, because the trip routes are no longer tabs of their own', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).not.toContain('href: null');
    expect(layout).toContain('name="(trips)"');
  });

  it('insets only the two bare tabs — the trip screens get theirs from ScreenHeader, and both would double up', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain('sceneStyle: bareScene(insets.top)');
    expect(layout.match(/bareScene\(insets\.top\)/g) ?? []).toHaveLength(2);
    expect(layout).not.toMatch(/screenOptions=\{\{[\s\S]*?paddingTop/);
  });

  it('declares every tab in the layout', () => {
    const layout = read(TABS, '_layout.tsx');

    for (const name of ['home', 'search', '(trips)', 'profile']) {
      expect(layout).toContain(`name="${name}"`);
    }
  });

  it('lets the layout own the tab labels — a screen-level title silently overrides them', () => {
    for (const screen of ['profile.tsx', 'home.tsx', 'search.tsx']) {
      expect(read(TABS, screen)).not.toMatch(/<Stack\.Screen/);
    }
    for (const screen of ['index.tsx', 'create.tsx']) {
      expect(read(TRIPS_GROUP, screen)).not.toMatch(/<Stack\.Screen/);
    }
  });

  it('is four tabs with no centre button — the mock relocates creation to the Trips screen (S4.13)', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).not.toContain('CREATE_BUTTON_SIZE');
    expect(layout).not.toContain('createButton');
    expect(layout.match(/<Tabs\.Screen/g) ?? []).toHaveLength(4);
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
    expect(read(TRIPS_GROUP, '_layout.tsx')).toContain('headerShown: false');
  });

  const FULL_BLEED = ['itineraries/[id]/published.tsx', 'itineraries/[id]/created.tsx'];

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

  it('creates from the Trips screen, straight to the form — the mock connector, not the chooser', () => {
    const trips = read(TRIPS_GROUP, 'index.tsx');

    expect(trips).toContain('href="/itineraries/new"');
    expect(trips).toContain('Plan a Trip');
    expect(trips).toContain('name="plusCircle"');
    expect(trips).not.toMatch(/Create Itinerary/);
    expect(read(TABS, '_layout.tsx')).not.toContain("router.push('/itineraries/create')");
  });

  it('scraps Add a Past Trip for good — the founder ruled it wontfix (S4.15 decision 6)', () => {
    const trips = read(TRIPS_GROUP, 'index.tsx');

    expect(trips).not.toMatch(/Add a Past Trip/);
    expect(trips).not.toMatch(/addPastTrip/);
  });

  it('closes the archived-trips door while the archive itself stays reachable (S4.15 decision 6)', () => {
    expect(read(TRIPS_GROUP, 'index.tsx')).not.toMatch(/Archived trips|itineraries\/archived/);
    expect(existsSync(join(TRIPS, 'archived.tsx'))).toBe(true);
  });

  it('greys the header search and filter rather than navigating nowhere (S4.15 decision 6)', () => {
    const trips = read(TRIPS_GROUP, 'index.tsx');

    expect(trips).toContain("comingSoon('tripSearch')");
    expect(trips).toContain("comingSoon('tripFilter')");
    expect(trips).toContain('name="filter"');
  });

  it('TELLS THE CACHE the cover landed — the upload bypasses the mutation hook, so nothing else will', () => {
    const create = read(TRIPS, 'new.tsx');

    expect(create).toMatch(/const withCover = await itineraryRepository\.uploadCover\(/);
    expect(create).toContain('await onItineraryUpdated(client, withCover)');
  });

  it('navigates BEFORE the upload, so Create Trip never blocks on bytes going up', () => {
    const create = read(TRIPS, 'new.tsx');
    const uploadAt = create.indexOf('void attachChosenCover(created.id)');
    const navigateAt = create.indexOf("router.replace({ pathname: '/itineraries/[id]/created'");

    expect(uploadAt).toBeGreaterThan(-1);
    expect(navigateAt).toBeGreaterThan(uploadAt);
    expect(create).not.toMatch(/await attachChosenCover/);
  });

  it('shows the picked photo while it uploads — a placeholder for a cover the traveler just chose reads as loss', () => {
    expect(read(TRIPS, 'new.tsx')).toContain('rememberCoverPreview(created.id, chosenCover.uri)');
    expect(read(TRIPS, 'new.tsx')).toContain('forgetCoverPreview(itineraryId)');

    for (const source of [read(TRIPS, '[id]', 'created.tsx'), read(MOBILE_ROOT, 'src', 'itineraries', 'TripRow.tsx')]) {
      expect(source).toContain('coverPreviewFor(');
      expect(source).toMatch(/uploaded \?\? \(localPreview === null \? null : \{ uri: localPreview \}\)/);
    }
  });

  it('never says "Uploading…" on the create form, where the only request in flight is the trip', () => {
    const create = read(TRIPS, 'new.tsx');
    const edit = read(TRIPS, '[id]', 'edit.tsx');

    expect(create).not.toMatch(/uploading=/);
    expect(create).toContain('busy={create.isPending}');
    expect(edit).toContain('uploading={uploadCover.isPending}');
  });

  it('binds the uploading label to a real upload, never to whatever else is pending', () => {
    const picker = read(MOBILE_ROOT, 'src', 'media', 'CoverPicker.tsx');

    expect(picker).not.toMatch(/busy \? UPLOADING_COVER_LABEL/);
    expect(picker.match(/uploading \? UPLOADING_COVER_LABEL/g) ?? []).toHaveLength(2);
  });

  it('fetches a card thumbnail through the AUTHENTICATED media path — a bare URL 401s (S3.3)', () => {
    const row = read(MOBILE_ROOT, 'src', 'itineraries', 'TripRow.tsx');

    expect(row).toContain('useMediaSource(thumbOf(coverImageUrl))');
    expect(row).not.toMatch(/source=\{\{\s*uri:/);
  });

  it('drops the destinations line the mock has no room for (S4.15 decision 5)', () => {
    const row = read(MOBILE_ROOT, 'src', 'itineraries', 'TripRow.tsx');

    expect(row).not.toMatch(/destinations\.join/);
    expect(row).not.toMatch(/formatDates/);
  });

  it('wears the briefcase on the Trips tab, as the mock draws it (icon fidelity)', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain("tabIcon('briefcase')");
    expect(layout).not.toContain("tabIcon('map')");
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

  it('names no origin at all — the stack remembers it, so no screen has to guess (founder, 2026-08-04)', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');
    const editor = read(TRIPS, '[id]', 'days', 'index.tsx');

    expect(preview).not.toMatch(/cameFromEditor|from === /);
    expect(editor).not.toMatch(/from: 'days'/);
  });

  it('makes Continue Editing OPEN the editor — not go back, which returns to wherever you came from', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');

    expect(preview).toMatch(/const continueEditing = \(\) =>\s*\n?\s*router\.push\(\{ pathname: '\/itineraries\/\[id\]\/days'/);
    expect(preview).not.toMatch(/continueEditing[\s\S]{0,120}router\.back\(\)/);
  });

  it('PUSHES every forward move, so back pops the screen the traveler actually came from', () => {
    for (const screen of [
      read(TRIPS, '[id]', 'preview.tsx'),
      read(TRIPS, '[id]', 'days', 'index.tsx'),
    ]) {
      expect(screen).not.toMatch(/router\.navigate\(/);
    }
  });

  it('lets no screen override back — the previous page always wins (founder, 2026-08-04)', () => {
    const header = read(MOBILE_ROOT, 'src', 'components', 'ScreenHeader.tsx');

    expect(header).not.toMatch(/alwaysBackTo/);
    expect(header).toContain('useSafeBack(backTo)');
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

  it('greys the workspace door on the overview — the redesign it opens is the next story (S4.15 decision 3)', () => {
    const overview = read(TRIPS, '[id]', 'created.tsx');

    expect(overview).toContain("comingSoon('tripWorkspace')");
    expect(overview).toContain('accessibilityState={{ disabled: true }}');
    expect(overview).not.toMatch(/pathname: '\/itineraries\/\[id\]'/);
  });

  it('keeps Preview Trip live and PUSHED, so back returns to the overview (S4.15 decision 3)', () => {
    const overview = read(TRIPS, '[id]', 'created.tsx');

    expect(overview).toMatch(/router\.push\(\{ pathname: '\/itineraries\/\[id\]\/preview'/);
  });

  it('leaves the publish-success screen alone — a different act, a different moment (spec AC 9)', () => {
    const published = read(TRIPS, '[id]', 'published.tsx');

    expect(published).toContain('Your Itinerary is Live!');
    expect(published).toContain('is now available for travelers to discover.');
  });

  it('retires the create-method chooser — a door with one exit (S4.15 decision 7)', () => {
    expect(existsSync(join(TRIPS, 'create.tsx'))).toBe(false);
  });

  it('keeps the legacy create path resolving, pointed at the form rather than the retired chooser', () => {
    expect(read(TRIPS_GROUP, 'create.tsx')).toContain('href="/itineraries/new"');
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

  it('offers a live cover picker rather than a greyed tile (S3.3)', () => {
    expect(create).toContain('<CoverPicker');
    expect(create).not.toContain('surface="coverPhoto"');
  });

  it('speaks the ratified language: Plan a Trip to enter, Create Trip to submit (S4.15 decision 8)', () => {
    expect(create).toContain('title="Plan a Trip"');
    expect(create).toContain('Create Trip');
    expect(create).not.toMatch(/Create Itinerary|Continue to Daily Schedules/);
  });

  it('prompts in every field rather than showing sample content (S4.15 decision 8)', () => {
    for (const prompt of [
      'Name your trip',
      'Where to?',
      'Days',
      'Best months to go',
      "What's this trip about?",
      'Add a standout',
    ]) {
      expect(create).toContain(`placeholder="${prompt}"`);
    }
    expect(create).not.toMatch(/Island Hopping in El Nido|Palawan"|Dec - Apr|Big Lagoon Kayaking/);
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

  it('lands the create flow on the overview, REPLACING the spent form so back reaches Trips (S4.15 decision 2)', () => {
    const create = read(TRIPS, 'new.tsx');

    expect(create).toMatch(/router\.replace\(\{ pathname: '\/itineraries\/\[id\]\/created'/);
    expect(create).not.toMatch(/pathname: '\/itineraries\/\[id\]\/days'/);
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
    read(TRIPS_GROUP, 'index.tsx'),
    read(TRIPS, 'new.tsx'),
    read(TRIPS, '[id]', 'created.tsx'),
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
