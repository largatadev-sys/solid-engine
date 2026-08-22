import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { COMING_SOON_SURFACES } from '../src/components/comingSoonMessage';
import { COG_IS_LIVE } from '../src/itineraries/tripSettingsItems';
import { DISCOVER_TAB_LABEL } from '../src/discovery/discoveryCopy';
import { tripRowDestination } from '../src/itineraries/TripRow';
import { tripFormChrome, tripFormFields } from '../src/itineraries/tripFormContract';


const MOBILE_ROOT = join(__dirname, '..');
const APP = join(MOBILE_ROOT, 'app');
const TABS = join(APP, '(tabs)');
const TRIPS_GROUP = join(TABS, '(trips)');
const PROFILE_GROUP = join(TABS, '(profile)');
const HOME_GROUP = join(TABS, '(home)');
const DISCOVER_GROUP = join(TABS, '(discover)');
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

  return walk(TRIPS).map((path) => [
    path.slice(TRIPS_GROUP.length + 1).replace(/\\/g, '/'),
    readFileSync(path, 'utf8'),
  ]);
}

describe('the tab group is the navigation frame (S4.9 decision 12)', () => {
  it('has one file per tab, and the trip flow is a single group rather than four sibling tabs', () => {
    expect(readdirSync(TABS).sort()).toEqual(
      ['_layout.tsx', '(home)', '(discover)', '(trips)', '(profile)'].sort(),
    );
  });

  it('groups the profile flow into one stack too, so the account page can never strand back (S4.13)', () => {
    expect(existsSync(join(PROFILE_GROUP, 'profile.tsx'))).toBe(true);
    expect(existsSync(join(PROFILE_GROUP, 'account.tsx'))).toBe(true);
    expect(read(PROFILE_GROUP, '_layout.tsx')).toContain('<Stack');
  });

  it('keeps the profile group off the root route, which (trips) already owns', () => {
    expect(existsSync(join(PROFILE_GROUP, 'index.tsx'))).toBe(false);
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
    expect(existsSync(join(TRIPS_GROUP, 'trips.tsx'))).toBe(true);
    expect(read(TRIPS_GROUP, '_layout.tsx')).toContain('<Stack');
  });

  it('nests no second stack under the trip stack, which is what stranded back on a sibling', () => {
    for (const nested of ['itineraries', 'published']) {
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

    for (const name of ['(home)', '(discover)', '(trips)', '(profile)']) {
      expect(layout).toContain(`name="${name}"`);
    }
  });

  it('sends the Profile tab to the profile itself, never back into the account page it pushed', () => {
    const layout = read(TABS, '_layout.tsx');
    const profileTab = layout.slice(layout.indexOf('name="(profile)"'));

    expect(profileTab).toContain('tabPress');
    expect(profileTab).toContain('router.canDismiss()');
    expect(profileTab).toContain('PROFILE_TAB_ROUTE');
  });

  it('sends the Trips tab to the Trips list, never back into the trip last opened (S4.20 addendum 4)', () => {
    const layout = read(TABS, '_layout.tsx');
    const tripsTab = layout.slice(layout.indexOf('name="(trips)"'));

    expect(tripsTab).toContain('tabPress');
    expect(tripsTab).toContain('tabJump(router.canDismiss(), inTripsStack(pathname))](TRIPS_TAB_ROUTE)');
  });

  it('dismisses only within its own stack — dismissTo cannot reach across one (S4.13)', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).toContain('tabJump(');
    expect(layout).not.toMatch(/router\.dismissTo\(/);
  });

  it('lets the layout own the tab labels — a screen-level title silently overrides them', () => {
    expect(read(DISCOVER_GROUP, 'discover.tsx')).not.toMatch(/<Stack\.Screen/);
    expect(read(HOME_GROUP, 'index.tsx')).not.toMatch(/<Stack\.Screen/);
    for (const screen of ['trips.tsx', 'create.tsx']) {
      expect(read(TRIPS_GROUP, screen)).not.toMatch(/<Stack\.Screen/);
    }
    for (const screen of ['profile.tsx', 'account.tsx']) {
      expect(read(PROFILE_GROUP, screen)).not.toMatch(/<Stack\.Screen/);
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

    expect(DISCOVER_TAB_LABEL).toBe('Discover');
    expect(layout).toContain('title: DISCOVER_TAB_LABEL');
    expect(layout).not.toMatch(/title: 'Search'/);
  });

  it('greys no tab at all — Discover went live at S4.3 and was the last one refusing taps', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout).not.toContain('comingSoon');
    expect(layout).not.toContain('coming soon');
    expect(layout).toContain('DISCOVER_TAB_ROUTE');
  });

  it('roots Discover in its own group, so browsing never pops onto a trip screen (S4.13)', () => {
    expect(existsSync(join(DISCOVER_GROUP, '_layout.tsx'))).toBe(true);
    expect(existsSync(join(DISCOVER_GROUP, 'discover.tsx'))).toBe(true);
    expect(read(DISCOVER_GROUP, '_layout.tsx')).toContain('<Stack');
  });

  it('keeps the discovery routes out of the trips catch-all, which owned every unclaimed path', () => {
    const jump = readFileSync(join(MOBILE_ROOT, 'src', 'navigation', 'tabJump.ts'), 'utf8');

    expect(jump).toContain('inDiscoverStack');
    expect(jump).toContain('!inDiscoverStack(pathname)');
  });

  it('roots Home in its own group so a pushed itinerary pops back to the feed (S4.13)', () => {
    expect(existsSync(join(HOME_GROUP, '_layout.tsx'))).toBe(true);
    expect(existsSync(join(HOME_GROUP, 'index.tsx'))).toBe(true);
    expect(existsSync(join(HOME_GROUP, 'feed', 'published', '[id].tsx'))).toBe(true);
    expect(read(HOME_GROUP, '_layout.tsx')).toContain('<Stack');
  });

  it('re-taps Home through the listener seam rather than navigating to itself', () => {
    const layout = read(TABS, '_layout.tsx');
    const homeTab = layout.slice(layout.indexOf('name="(home)"'));

    expect(homeTab).toContain('inHomeStack(pathname)');
    expect(homeTab).toContain('homeTabRetapped()');
  });

  it('moves the Trips index off "/" so the root belongs to the feed (S4.22)', () => {
    expect(existsSync(join(TRIPS_GROUP, 'index.tsx'))).toBe(false);
    expect(existsSync(join(TRIPS_GROUP, 'trips.tsx'))).toBe(true);
  });

  it('gives every tab a real icon — an unset one renders as a tofu box on Android', () => {
    const layout = read(TABS, '_layout.tsx');

    expect(layout.match(/tabBarIcon:/g) ?? []).toHaveLength(4);
  });

  it('shows no navigator header anywhere — every heading is drawn as page content', () => {
    expect(read(TABS, '_layout.tsx')).toContain('headerShown: false');
    expect(read(TRIPS_GROUP, '_layout.tsx')).toContain('headerShown: false');
  });

  const FULL_BLEED = [
    'itineraries/[id]/published.tsx',
    'itineraries/[id]/created.tsx',
    'itineraries/[id]/forked.tsx',
    'itineraries/[id]/activity.tsx',
    'itineraries/[id]/diary/posted.tsx',
  ];

  const WORKSPACE_HEADER = ['itineraries/[id]/index.tsx', 'itineraries/[id]/edit-plan.tsx'];

  const REDIRECT_STUBS = ['itineraries/[id]/days/index.tsx', 'itineraries/[id]/days/[dayId].tsx'];

  const TRIP_FORM = ['itineraries/new.tsx'];

  const SHARED_SCREENS: [string, string, RegExp][] = [
    ['itineraries/[id]/diary/[entryId].tsx', 'src/diary/DiaryEntryScreen.tsx', /<ScreenHeader/],
    ['itineraries/[id]/diary/index.tsx', 'src/diary/TripDiaryScreen.tsx', /styles\.title/],
  ];

  it.each(SHARED_SCREENS)(
    '%s is a thin route over %s — two stacks reach one screen (S4.21)',
    (route, shared, heading) => {
      const component = shared.split('/').at(-1)?.replace('.tsx', '') ?? '';
      const wrapper = read(TRIPS_GROUP, ...route.split('/'));

      expect(wrapper).toMatch(new RegExp(component));
      expect(wrapper).not.toMatch(/<ScreenHeader/);
      expect(read(MOBILE_ROOT, ...shared.split('/'))).toMatch(heading);
    },
  );

  it.each(tripScreens().filter(([name]) => REDIRECT_STUBS.includes(name)))(
    '%s draws no chrome at all — a retired route redirects, it does not render',
    (_name, source) => {
      expect(source).toContain('<Redirect');
      expect(source).not.toMatch(/<ScreenHeader|<WorkspaceHeader/);
    },
  );

  it.each(tripScreens().filter(([name]) => WORKSPACE_HEADER.includes(name)))(
    '%s draws the workspace header, which takes the inset for it (S4.17)',
    (_name, source) => {
      expect(source).toMatch(/<WorkspaceHeader/);
    },
  );

  it('makes the workspace header take the status-bar inset — the mock draws no header bar', () => {
    const header = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceHeader.tsx');

    expect(header).toMatch(/useSafeAreaInsets/);
    expect(header).toMatch(/paddingTop: insets\.top/);
  });

  it.each(
    tripScreens().filter(
      ([name]) =>
        !FULL_BLEED.includes(name) &&
        !WORKSPACE_HEADER.includes(name) &&
        !REDIRECT_STUBS.includes(name) &&
        !TRIP_FORM.includes(name) &&
        !SHARED_SCREENS.some(([route]) => route === name),
    ),
  )('%s draws its own heading — with no header bar, a navigator title renders nowhere', (_name, source) => {
    expect(source).toMatch(/<ScreenHeader/);
  });

  it.each(tripScreens().filter(([name]) => TRIP_FORM.includes(name)))(
    '%s hands its heading to the shared trip form, which draws one per mode (S4.19)',
    (_name, source) => {
      expect(source).toMatch(/<TripForm/);
    },
  );

  it('makes the shared trip form draw the heading its mode names, stacked under a bare chevron (the S4.15 mock)', () => {
    const form = read(MOBILE_ROOT, 'src', 'itineraries', 'TripForm.tsx');

    expect(form).toMatch(/<ScreenHeader/);
    expect(form).toContain('{chrome.headline}</Text>');
    expect(form).toContain('styles.pageTitle');
  });

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
    const trips = read(TRIPS_GROUP, 'trips.tsx');

    expect(trips).toContain('href="/itineraries/new"');
    expect(trips).toContain('Plan a Trip');
    expect(trips).toContain('name="plusCircle"');
    expect(trips).not.toMatch(/Create Itinerary/);
    expect(read(TABS, '_layout.tsx')).not.toContain("router.push('/itineraries/create')");
  });

  it('scraps Add a Past Trip for good — the founder ruled it wontfix (S4.15 decision 6)', () => {
    const trips = read(TRIPS_GROUP, 'trips.tsx');

    expect(trips).not.toMatch(/Add a Past Trip/);
    expect(trips).not.toMatch(/addPastTrip/);
  });

  it('opens the archived-trips door from the Completed tab alone (S4.26, canvas C6)', () => {
    const trips = read(TRIPS_GROUP, 'trips.tsx');

    expect(trips).toMatch(/Archived trips/);
    expect(trips).toMatch(/itineraries\/archived/);
    expect(trips).toContain('showsArchivedLink(');
    expect(existsSync(join(TRIPS, 'archived.tsx'))).toBe(true);
  });

  it('keeps search greyed and drops the filter icon the canvas does not draw (S4.26)', () => {
    const trips = read(TRIPS_GROUP, 'trips.tsx');

    expect(trips).toContain("comingSoon('tripSearch')");
    expect(trips).not.toContain("comingSoon('tripFilter')");
    expect(trips).not.toContain('name="filter"');
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
      expect(source).toContain('localPreview={localPreview}');
    }

    expect(read(MOBILE_ROOT, 'src', 'media', 'MediaThumb.tsx')).toMatch(
      /uploaded \?\? \(localPreview === null \? null : \{ uri: localPreview \}\)/,
    );
  });

  it('never says "Uploading…" on the create form, where the only request in flight is the trip', () => {
    const create = read(TRIPS, 'new.tsx');
    const edit = read(TRIPS, '[id]', 'edit.tsx');

    expect(create).not.toMatch(/uploading:/);
    expect(create).toContain('busy: create.isPending');
    expect(edit).toContain('uploading: uploadCover.isPending');
  });

  it('takes cover behaviour from the mode, never from the shared form (S4.19 decision 5)', () => {
    const form = read(MOBILE_ROOT, 'src', 'itineraries', 'TripForm.tsx');
    const create = read(TRIPS, 'new.tsx');

    expect(form).not.toMatch(/useUploadCover|acquireEditLock|pickPhoto/);
    expect(form).toContain('uploading={cover.uploading ?? false}');
    expect(create).toContain('await itineraryRepository.acquireEditLock(itineraryId');
  });

  it('binds the uploading label to a real upload, never to whatever else is pending', () => {
    const picker = read(MOBILE_ROOT, 'src', 'media', 'CoverPicker.tsx');

    expect(picker).not.toMatch(/busy \? UPLOADING_COVER_LABEL/);
    expect(picker.match(/uploading \? UPLOADING_COVER_LABEL/g) ?? []).toHaveLength(2);
  });

  it('fetches every thumbnail through the AUTHENTICATED media path — a bare URL 401s (S3.3)', () => {
    const thumb = read(MOBILE_ROOT, 'src', 'media', 'MediaThumb.tsx');

    expect(thumb).toContain('useMediaSource(full ? url : thumbOf(url))');

    const consumers = [
      join(MOBILE_ROOT, 'src', 'itineraries', 'TripRow.tsx'),
      join(MOBILE_ROOT, 'src', 'itineraries', 'AvatarStack.tsx'),
      join(MOBILE_ROOT, 'src', 'itineraries', 'PublishedItineraryView.tsx'),
      join(MOBILE_ROOT, 'src', 'members', 'TravelerAvatar.tsx'),
      join(MOBILE_ROOT, 'src', 'components', 'Avatar.tsx'),
      join(MOBILE_ROOT, 'src', 'profile', 'ProfileCardView.tsx'),
      join(TRIPS, '[id]', 'created.tsx'),
    ];

    for (const file of consumers) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('<MediaThumb');
      expect(source).not.toMatch(/source=\{\{\s*uri:/);
      expect(source).not.toContain('useMediaSource(');
    }
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
    expect(read(MOBILE_ROOT, 'src', 'itineraries', 'TripForm.tsx')).toContain('Standout');

    for (const screen of [
      read(TRIPS, 'new.tsx'),
      read(TRIPS, '[id]', 'edit.tsx'),
      read(MOBILE_ROOT, 'src', 'itineraries', 'TripForm.tsx'),
    ]) {
      expect(screen).not.toMatch(/Highlight/);
    }
  });

  it('walks a completed trip from the viewer rail into the preview, where publishing happens', () => {
    const viewer = read(TRIPS, '[id]', 'index.tsx');

    expect(viewer).toContain("pathname: '/itineraries/[id]/preview'");
    expect(viewer).toContain('canPublish(data)');
  });

  it('ends the creation walk with no terminal declaration at all — S4.26 retired the act', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');

    expect(preview).not.toMatch(/Finish Itinerary/);
    expect(preview).not.toMatch(/finish-planning/);
    expect(preview).not.toMatch(/'draft'/);
    expect(preview).not.toMatch(/Complete Itinerary/);
  });

  it('names no origin at all — the stack remembers it, so no screen has to guess (founder, 2026-08-04)', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');
    const editor = read(TRIPS, '[id]', 'edit-plan.tsx');

    expect(preview).not.toMatch(/cameFromEditor|from === /);
    expect(editor).not.toMatch(/from: '/);
  });

  it('makes Continue Editing OPEN the editor — not go back, which returns to wherever you came from', () => {
    const preview = read(TRIPS, '[id]', 'preview.tsx');

    expect(preview).toMatch(
      /const continueEditing = \(\) =>\s*\n?\s*router\.push\(\{ pathname: '\/itineraries\/\[id\]\/edit-plan'/,
    );
    expect(preview).not.toMatch(/continueEditing[\s\S]{0,120}router\.back\(\)/);
  });

  it('PUSHES every forward move, so back pops the screen the traveler actually came from', () => {
    for (const screen of [
      read(TRIPS, '[id]', 'preview.tsx'),
      read(TRIPS, '[id]', 'edit-plan.tsx'),
      read(TRIPS, '[id]', 'index.tsx'),
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

  it('opens an unpublished trip on the Trip Workspace, its one home surface (S4.17 decision 1)', () => {
    const row = read(MOBILE_ROOT, 'src', 'itineraries', 'TripRow.tsx');

    expect(row).toContain("pathname: '/itineraries/[id]'");
    expect(row).not.toContain("pathname: '/itineraries/[id]/preview'");
    expect(row).not.toContain("pathname: '/itineraries/[id]/days'");
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

  it('titles and labels the activity form as the workspace mock draws it (S4.17 decision 8)', () => {
    const activity = read(TRIPS, '[id]', 'activity.tsx');

    expect(activity).toContain("'Edit Activity' : 'Add Activity'");
    expect(activity).toContain('label="Activity Name"');
    expect(activity).toContain('label="Location / Venue"');
    expect(activity).toContain('label="Estimated Price"');
    expect(activity).toContain('label="Booking Link"');
    expect(activity).toContain('Save Activity');
    expect(activity).toContain("'Discard Changes' : 'Cancel'");
    expect(activity).not.toContain('Daily Activity');
  });

  it('culls description, tips, photos and the booking card editor from the form (S4.17 decision 8)', () => {
    const activity = read(TRIPS, '[id]', 'activity.tsx');

    expect(activity).not.toContain('Notes & Creator Tips');
    expect(activity).not.toContain('ActivityPhotoStrip');
    expect(activity).not.toContain('Booking Purpose');
    expect(activity).not.toContain('Booking Provider');
    expect(activity).not.toContain('Move to another day');
  });

  it('preserves the culled wire fields through the shared request builder (S4.17 decision 8)', () => {
    const activity = read(TRIPS, '[id]', 'activity.tsx');

    expect(activity).toContain('buildActivityRequest');
  });

  it('shows no edit attribution on activity rows — the mock draws a name and a time, nothing else', () => {
    const card = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceDayCard.tsx');

    expect(card).not.toMatch(/attributionLine|styles\.attribution/);
  });

  it('takes a booking link as a pasted URL, the provider card being E6 input (S4.17 decision 8)', () => {
    const activity = read(TRIPS, '[id]', 'activity.tsx');

    expect(activity).toContain('Paste booking URL here...');
    expect(activity).toContain('externalUrl');
    expect(activity).not.toMatch(/PROVIDER \d|Add another|Target URL/);
  });

  it('opens the workspace door S4.15 greyed — the redesign it waited for is this story (S4.17 decision 12)', () => {
    const overview = read(TRIPS, '[id]', 'created.tsx');

    expect(overview).toMatch(/router\.push\(\{ pathname: '\/itineraries\/\[id\]', params: \{ id \} \}\)/);
    expect(overview).not.toContain("comingSoon('tripWorkspace')");
    expect(overview).not.toContain('accessibilityState={{ disabled: true }}');
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


describe('the create form asks for a duration, never dates (S4.9 decision 13; dates returned to EDIT at S4.25)', () => {
  const create = read(TRIPS, 'new.tsx');
  const form = read(MOBILE_ROOT, 'src', 'itineraries', 'TripForm.tsx');

  it('keeps create free of dates while edit draws them (S4.25 artboards 2 and 4)', () => {
    expect(create).not.toMatch(/DatePicker/);
    expect(create).not.toMatch(/startDate|endDate/);
    expect(form).toMatch(/ClearableDateField/);
    expect(form).toMatch(/fields\.showsDates/);
  });

  it('gives each date a drawn clear on BOTH platforms — the web input has none (S4.25 ticket 04)', () => {
    const field = read(MOBILE_ROOT, 'src', 'itineraries', 'ClearableDateField.tsx');

    expect(field).toMatch(/clearDateLabel/);
    expect(field).toMatch(/onChange\(''\)/);
  });

  it('sends every clearable field explicitly, so a blank date is a null and not an omission', () => {
    const contract = read(MOBILE_ROOT, 'src', 'itineraries', 'tripFormContract.ts');

    expect(contract).toMatch(/startDate: blankToNull\(form\.startDate\)/);
    expect(contract).toMatch(/endDate: blankToNull\(form\.endDate\)/);
  });

  it('takes a free-text destination and never says "Search"', () => {
    expect(form).toContain('label="Destination"');
    expect(create).toContain("createRequestFrom(values)");
    expect(form).not.toMatch(/placeholder="Search/);
  });

  it('offers a live cover picker rather than a greyed tile (S3.3)', () => {
    expect(form).toContain('<CoverPicker');
    expect(form).not.toContain('surface="coverPhoto"');
  });

  it('speaks the ratified language: Plan a Trip to enter, Create Trip to submit (S4.15 decision 8)', () => {
    expect(tripFormChrome('create')).toEqual({ headline: 'Plan a Trip', submitLabel: 'Create Trip' });
    expect(form).toContain('{chrome.headline}</Text>');
    expect(form).toContain('{chrome.submitLabel}');
    expect(form).not.toMatch(/Create Itinerary|Continue to Daily Schedules/);
  });

  it('prompts in every field rather than showing sample content (S4.15 decision 8)', () => {
    for (const prompt of [
      'Name your trip',
      'Where to?',
      'Best months to go',
      "What's this trip about?",
      'Add a standout',
    ]) {
      expect(form).toContain(`placeholder="${prompt}"`);
    }
    expect(form).toContain("`${days} Days`");
    expect(form).not.toMatch(/Island Hopping in El Nido|Palawan"|Dec - Apr|Big Lagoon Kayaking/);
  });

  it('draws the mock-s Destination + Duration row, one destination and a dropdown (addendum 4)', () => {
    expect(form).toContain('label="Destination"');
    expect(form).toContain('<DurationField');
    expect(form).toContain('styles.fieldRow');
    expect(form).not.toMatch(/Add destination|keyboardType="number-pad"/);
  });
});


describe('one plan, two surfaces — viewer and editor (ADR-022, superseding the 2026-07-31 ruling)', () => {
  it('retires the planner and the day view to redirect stubs — old deep links must not dead-end', () => {
    for (const name of ['index.tsx', '[dayId].tsx']) {
      const stub = read(TRIPS, '[id]', 'days', name);

      expect(stub).toContain('<Redirect');
      expect(stub).toContain("pathname: '/itineraries/[id]'");
      expect(stub).not.toContain('useItinerary');
    }
  });

  it('carries a ?day= deep link through to the workspace, landing on that day expanded', () => {
    expect(read(TRIPS, '[id]', 'days', 'index.tsx')).toContain('{ id, day }');
    expect(read(TRIPS, '[id]', 'index.tsx')).toContain('defaultOpenDay(dayIds, requestedDay)');
  });

  it('ships exactly the two workspace surfaces the redesign names', () => {
    expect(existsSync(join(TRIPS, '[id]', 'index.tsx'))).toBe(true);
    expect(existsSync(join(TRIPS, '[id]', 'edit-plan.tsx'))).toBe(true);
  });

  it('reaches the editor from nowhere but Edit Itinerary and Continue Editing', () => {
    const reachers = tripScreens().filter(([, source]) =>
      source.includes("pathname: '/itineraries/[id]/edit-plan'"),
    );

    expect(reachers.map(([name]) => name).sort()).toEqual([
      'itineraries/[id]/index.tsx',
      'itineraries/[id]/preview.tsx',
    ]);
  });

  it('expands a viewer day card in place rather than routing to a day screen (S4.17 decision 6)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain('<WorkspaceDayCard');
    expect(workspace).toContain('toggleOpenDay');
    expect(workspace).not.toContain("pathname: '/itineraries/[id]/days/[dayId]'");
  });

  it('lands the create flow on the overview, REPLACING the spent form so back reaches Trips (S4.15 decision 2)', () => {
    const create = read(TRIPS, 'new.tsx');

    expect(create).toMatch(/router\.replace\(\{ pathname: '\/itineraries\/\[id\]\/created'/);
    expect(create).not.toMatch(/pathname: '\/itineraries\/\[id\]\/days'/);
  });

  it('opens EVERY own unpublished trip in the Trip Workspace, whatever its state (S4.17 decision 1)', () => {
    for (const state of ['upcoming', 'ongoing', 'completed'] as const) {
      expect(
        tripRowDestination({ id: 'trip-1', archived: false, published: false, state }).pathname,
      ).toBe('/itineraries/[id]');
    }
  });

  it('keeps a published trip on its published view — the workspace is for unpublished trips', () => {
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
      tripRowDestination({ id: 'trip-1', archived: true, published: false, state: 'upcoming' }).pathname,
    ).toBe('/itineraries/[id]');
  });

  it('the activity form picks a time rather than asking anyone to type one', () => {
    const form = read(TRIPS, '[id]', 'activity.tsx');

    expect(form).toContain('<TimePicker');
    expect(form).not.toMatch(/Time \(24h\)/);
  });

  it('keeps building the plan on the editor: accordion, Add a Day, per-activity edit and delete', () => {
    const editor = read(TRIPS, '[id]', 'edit-plan.tsx');

    expect(editor).toContain('<WorkspaceDayCard');
    expect(editor).toContain('Add a Day');
    expect(editor).toContain('<DraggableActivityList');
    expect(editor).toContain('onDeleteDay');
  });

  it('stages a drop into the buffer instead of persisting it — the per-drop retry died with S4.18', () => {
    const editor = read(TRIPS, '[id]', 'edit-plan.tsx');

    expect(editor).toContain('applyDrop');
    expect(editor).toContain('stageReorder(plan, dayId, desired)');
    expect(editor).not.toContain('expectedActivityIds');
    expect(editor).not.toContain('STALE_REORDER');
  });

  it('writes to the server exactly once, at Save Changes — no per-action mutation survives in the editor', () => {
    const editor = read(TRIPS, '[id]', 'edit-plan.tsx');

    for (const retired of [
      'useAppendDay',
      'useRenameDay',
      'useDeleteDay',
      'useDeleteActivity',
      'useReorderActivities',
    ]) {
      expect(editor).not.toContain(retired);
    }
    expect(editor).toContain('useSavePlan');
    expect(editor).toContain('commit(saveRequestFor(staged.draft))');
  });

  it('re-acquires the session at save, so a lapse mid-edit does not strand the buffer (S4.18 ticket 07)', () => {
    const editor = read(TRIPS, '[id]', 'edit-plan.tsx');

    expect(editor).toContain("session.acquire({ subjectType: 'session' }).then");
    expect(editor).toContain("saveError.code !== 'STALE_PLAN'");
    expect(editor).toContain("detailNumber('currentPlanVersion')");
    expect(editor).toContain('chooseOnStalePlan(stalePlanWording()');
  });

  it('confirms before discarding staged edits, on every exit door (S4.18 decision 2)', () => {
    const editor = read(TRIPS, '[id]', 'edit-plan.tsx');

    expect(editor).toContain('discardStagedEditsWording()');
    expect(editor).toContain('onBack={attemptExit}');
    expect(editor).toContain('useExitGuard(dirty,');
  });

  it('keeps a non-drag reorder path on both platforms — keys on web, a11y actions on native', () => {
    const web = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.web.tsx');
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');

    expect(web).toContain('onKeyDown');
    expect(native).toContain('Gesture.Pan');
    expect(native).toContain('reorderActionsFor(index, count)');
    expect(read(MOBILE_ROOT, 'src', 'itineraries', 'landingSlot.ts')).toContain(
      "{ name: 'moveUp', label: 'Move up' }",
    );
  });

  it('returns every animated key on EVERY branch, so the lift resets when the drag ends', () => {
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');
    const body = native.slice(native.indexOf('useAnimatedStyle'), native.indexOf('return (\n    <GestureDetector'));

    for (const key of ['elevation', 'opacity', 'shadowOpacity', 'backgroundColor', 'zIndex']) {
      expect(body.match(new RegExp(`\\b${key}:`, 'g')) ?? []).toHaveLength(1);
      expect(body).toMatch(new RegExp(`\\b${key}:\\s*isHeld`));
    }

    expect(body.match(/return \{/g) ?? []).toHaveLength(1);
  });

  it('leaves a resting row unpainted — the lift belongs to the drag, not the list', () => {
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');
    const staticStyle = native.slice(native.indexOf('StyleSheet.create'));

    expect(staticStyle).not.toContain('backgroundColor');
    expect(staticStyle).not.toContain('shadowOpacity');
  });

  it('drags on BOTH platforms off one shared drop calculation (founder, 2026-08-09)', () => {
    const web = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.web.tsx');
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');

    expect(web).toContain('onPointerDown');
    expect(web).toContain('setPointerCapture');
    expect(web).not.toContain('Gesture.Pan');

    for (const source of [web, native]) {
      expect(source).toContain('landingSlot(');
    }
    expect(web).toContain('displacementFor(');
  });

  it('keyboard reorder lives on the focusable grip — the arrows retired, the capability did not', () => {
    const web = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.web.tsx');

    expect(web).toContain('focusable: true');
    expect(web).toContain('onKeyDown');
    expect(web).toContain("key !== 'ArrowUp' && key !== 'ArrowDown'");
    expect(web).toContain('reorderActionsFor(index, count)');
    expect(web).not.toContain('canMoveUp');
  });

  it('commits the new order LOCALLY at release, so the drop never waits for the server', () => {
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');
    const web = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.web.tsx');
    const queries = read(MOBILE_ROOT, 'src', 'query', 'itineraryQueries.ts');

    for (const source of [native, web]) {
      expect(source).toContain('setLocalOrder(null)');
      expect(source).toContain('orderedBy(activities, localOrder)');
    }
    expect(web).toContain('setLocalOrder(movedTo(');
    expect(native).toContain('setLocalOrder(order)');

    expect(queries).toContain('onMutate');
    expect(queries).toContain('reorderInPlanCache(client, itineraryId, dayId, activityIds)');
  });

  it('settles only the REMAINDER after release — the sub-slot distance, never the whole travel', () => {
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');
    const web = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.web.tsx');

    expect(native).toContain('withSpring(slot * rowPitch.value, SETTLE');
    expect(native).toContain('overshootClamping: true');
    expect(web).toContain('const remainder = translation.current - (target - index) * pitch.current');
  });

  it('native positions rows by a UI-thread slot map, so a re-key can never move a pixel', () => {
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');

    expect(native).toContain('slotsFromIds(');
    expect(native).toContain('orderFromSlots(slots.value)');
    expect(native).toContain("position: 'absolute'");
    expect(native).not.toContain('displacementFor(');
  });

  it('web settles through the Web Animations API — a CSS transition dies when React moves the node', () => {
    const web = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.web.tsx');

    expect(web).toContain('element.animate(');
    expect(web).toContain('translateY(${remainder}px)');
    expect(web).toContain('running.cancel()');
    expect(web).not.toContain('settling');
  });

  it('shifts the other rows LIVE during a drag — slots reassign progressively as the finger passes', () => {
    const native = read(MOBILE_ROOT, 'src', 'itineraries', 'DraggableActivityList.native.tsx');

    expect(native).toContain('reassigned(slots.value, activity.id, hovered)');
    expect(native).toContain('landingSlot(dragY.value, 0, count, rowPitch.value)');
    expect(native).toContain('withSpring(');
    expect(native).toContain('onLayout');
  });

  it('holds the Editing Session for as long as the editor is open (S4.17 decision 4)', () => {
    const editor = read(TRIPS, '[id]', 'edit-plan.tsx');

    expect(editor).toContain("acquire({ subjectType: 'session' })");
    expect(editor).toContain('session.release()');
  });

  it('keeps the viewer read-only — it renders no editing affordance at all (S4.17 decision 2)', () => {
    const viewer = read(TRIPS, '[id]', 'index.tsx');

    expect(viewer).toContain("workspaceAffordances('viewer', isOwner)");
    expect(viewer).not.toContain('onDeleteActivity');
    expect(viewer).not.toContain('onAddActivity');
    expect(viewer).not.toContain('Add a Day');
  });

  it('keeps the archived banner above the tabs — an archived trip explains itself first', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');
    const tabRowAt = workspace.indexOf('<WorkspaceTabRow');

    expect(tabRowAt).toBeGreaterThan(-1);
    expect(workspace.indexOf('<TripArchiveBanner')).toBeLessThan(tabRowAt);
  });

  it('offers no way to archive from the UI — the control was pulled (founder, 08/01)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).not.toContain('ArchiveTripLink');
    expect(workspace).not.toContain('Archive trip');
  });

  it('opens a Travelers row in place, navigating nowhere at all (S4.20 addendum)', () => {
    const travelers = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceTravelersTab.tsx');

    expect(travelers).toContain('<TravelerDialog');
    expect(travelers).not.toContain('router.push');
    expect(travelers).not.toContain("pathname: '/members/[itineraryId]'");
  });

  it('centres the traveler dialog rather than docking it (S4.20 addendum 2)', () => {
    const dialog = read(MOBILE_ROOT, 'src', 'profile', 'TravelerDialog.tsx');

    expect(dialog).toContain("justifyContent: 'center'");
    expect(dialog).not.toContain("justifyContent: 'flex-end'");
    expect(dialog).not.toContain('grabber');
    expect(dialog).not.toMatch(/borderTopLeftRadius/);
  });

  it('caps every Modal at the phone frame — RN renders them outside MobileFrame on web', () => {
    const sourcesUnder = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? sourcesUnder(join(dir, entry.name))
          : entry.name.endsWith('.tsx')
            ? [join(dir, entry.name)]
            : [],
      );

    const overlays = [...sourcesUnder(join(MOBILE_ROOT, 'src')), ...sourcesUnder(APP)].filter((file) =>
      readFileSync(file, 'utf8').includes('<Modal'),
    );

    expect(overlays.length).toBeGreaterThanOrEqual(2);

    for (const file of overlays) {
      const source = readFileSync(file, 'utf8');
      expect(source).toMatch(/maxWidth:/);
      expect(source).toContain("alignItems: 'center'");
    }
  });

  it('closes the dialog on the frame it is tapped, animating nothing (S4.20 addendum 3)', () => {
    const dialog = read(MOBILE_ROOT, 'src', 'profile', 'TravelerDialog.tsx');

    expect(dialog).toContain('animationType="none"');
    expect(dialog).not.toContain('animationType="fade"');
    expect(dialog).not.toContain('animationType="slide"');
  });

  it('never blanks the card before the window it lives in (S4.20 addendum 3)', () => {
    const dialog = read(MOBILE_ROOT, 'src', 'profile', 'TravelerDialog.tsx');

    expect(dialog).toContain('const shown = useRetainedWhileClosing(traveler)');
    expect(dialog).toContain('{shown !== null && (');
    expect(dialog).not.toContain('{traveler !== null && (');
  });

  it('deletes the members screen, the offer banner and the invite screen (S4.28 tickets 06/07)', () => {
    expect(existsSync(join(TRIPS_GROUP, 'members'))).toBe(false);
    expect(existsSync(join(MOBILE_ROOT, 'src', 'members', 'OwnershipOfferBanner.tsx'))).toBe(false);
    expect(existsSync(join(TRIPS, '[id]', 'invite.tsx'))).toBe(false);
  });

  it('leaves no navigation reference behind to any of them — the S4.13 dead-weight lesson', () => {
    for (const [route, source] of tripScreens()) {
      const where = `${route}: ${source}`;

      expect(where).not.toMatch(/href=\{?['"`][^'"`]*\/members\//);
      expect(where).not.toMatch(/pathname: ['"]\/members\//);
      expect(where).not.toContain("'/itineraries/[id]/invite'");
      expect(where).not.toContain('Invite Traveler');
    }
  });

  it('rehomes ownership transfer into the Travelers tab, which is now its only door', () => {
    const travelers = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceTravelersTab.tsx');

    expect(travelers).toContain('OwnershipOfferCard');
    expect(travelers).toContain('useAcceptOwnershipOffer');
    expect(travelers).toContain('useOfferOwnership');
  });

  it('opens the dialog on the tapped traveler, so two rows cannot show one profile', () => {
    const travelers = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceTravelersTab.tsx');

    expect(travelers).toContain('setProfileFor(member)');
    expect(travelers).toContain('traveler={profileFor}');
  });

  it('makes the avatar the row’s only tap target — the rest of the row is inert (S4.28 C3)', () => {
    const rows = read(MOBILE_ROOT, 'src', 'members', 'TravelerRows.tsx');

    expect(rows).toContain('view profile');
    expect(rows).toContain('travelerMetrics.avatarHit');
    expect(rows).not.toMatch(/<Pressable[^>]*style=\{styles\.row\}/);
  });

  it('retires the stub route the dialog replaced, leaving no screen nothing reaches', () => {
    expect(existsSync(join(TRIPS, '[id]', 'travelers'))).toBe(false);
  });

  it('greys Visit Profile through the shared helper, so it SAYS something on both platforms', () => {
    const dialog = read(MOBILE_ROOT, 'src', 'profile', 'TravelerDialog.tsx');

    expect(dialog).toContain("comingSoon('profile')");
    expect(dialog).not.toMatch(/disabled=\{true\}/);
    expect(COMING_SOON_SURFACES).toHaveProperty('profile');
  });

  it('reads the three axes through helpers, never by comparing them inline (ADR-019)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain('stateBadge(data)');
    expect(workspace).toContain('ladderCta(data, isOwner, myId)');
    expect(workspace).not.toMatch(/data\.visibility === '/);
    expect(workspace).not.toMatch(/data\.state === '/);
  });

  it('lets the publish CTA explain the complete gate rather than vanishing (ADR-019, AC 13)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain('canPublish(data)');
    expect(workspace).toContain('publishNeedsCompleteBody');
  });

  it('puts Edit Itinerary in the viewer header, pointing at the Itinerary Workspace (S4.24)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain("actionLabel={editAction.kind === 'hidden' ? undefined : 'Edit Itinerary'}");
    expect(workspace).toContain("pathname: '/itineraries/[id]/edit-plan'");
    expect(workspace).toContain('editItineraryAction(data, canEditPlan(data), myId)');
  });

  it('never reopens from any surface — Step back retired and no CTA replaced it (S4.26 decision 10)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).not.toContain('reopen-then-edit');
    expect(workspace).not.toMatch(/'reopen'/);
    expect(workspace).not.toMatch(/stepBackWording|showsStepBack|Step back/);
  });


  it('confirms both forward transitions in the shared drawer (S4.26 decision 11, canvas C5)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toContain('forwardConfirmWording(');
    expect(workspace).toContain('<TransitionDrawer');
    expect(existsSync(join(MOBILE_ROOT, 'src', 'itineraries', 'FinalizeSheet.tsx'))).toBe(false);
  });

  it('puts publish on the viewer rail and unpublish behind the cog (S4.1 decision 11, re-housed at S4.25)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');
    const menu = read(MOBILE_ROOT, 'src', 'itineraries', 'tripSettingsItems.ts');

    expect(workspace).toContain('runLadder');
    expect(workspace).toContain('unpublishTripWording()');
    expect(menu).toContain('unpublish');
  });

  it('deletes the Details tab outright — no component, no tab key, no reference (S4.25 ticket 03)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');
    const tabRow = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceTabRow.tsx');

    expect(existsSync(join(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceDetailsTab.tsx'))).toBe(false);
    expect(tabRow).not.toMatch(/'details'/);
    expect(tabRow).not.toMatch(/label: 'Details'/);
    expect(workspace).not.toMatch(/WorkspaceDetailsTab/);
  });

  it('anchors the cog menu to the MEASURED cog, never to a hardcoded offset (founder, 2026-08-18)', () => {
    const menu = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceSettingsMenu.tsx');
    const header = read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceHeader.tsx');
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(menu).toMatch(/top: anchorY \+ MENU_GAP/);
    expect(menu).not.toMatch(/MENU_TOP/);
    expect(header).toMatch(/onSettingsLayout\?\.\(/);
    expect(header).toMatch(/insets\.top \+ HEADER_TOP_PADDING/);
    expect(workspace).toMatch(/onSettingsLayout=\{setCogY\}/);
  });

  it('draws neither the facts line nor the cog — both parked (founder, 2026-08-18)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).not.toMatch(/[Ff]actsLine/);
    expect(workspace).toMatch(/onSettings=\{showsSettingsCog\(data, isOwner\) \?/);
    expect(COG_IS_LIVE).toBe(false);
  });

  it('fills the subtitle slot S4.17 reserved with fork attribution, and nothing else (S4.7)', () => {
    const workspace = read(TRIPS, '[id]', 'index.tsx');

    expect(workspace).toMatch(/provenance=\{attributionLabel\(data\.forkedFrom\)\}/);
    expect(workspace).toMatch(/onProvenancePress=/);
  });
});


describe('every greyed affordance is wired to the shared helper (register #2)', () => {
  const screens = [
    read(TABS, '_layout.tsx'),
    read(TRIPS_GROUP, 'trips.tsx'),
    read(TRIPS, 'new.tsx'),
    read(TRIPS, '[id]', 'created.tsx'),
    read(TRIPS, '[id]', 'index.tsx'),
    read(TRIPS, '[id]', 'edit-plan.tsx'),
    read(TRIPS, '[id]', 'activity.tsx'),
    read(MOBILE_ROOT, 'src', 'components', 'ComingSoonScreen.tsx'),
    read(MOBILE_ROOT, 'src', 'itineraries', 'PublishedItineraryView.tsx'),
    read(MOBILE_ROOT, 'src', 'itineraries', 'WorkspaceTabRow.tsx'),
    read(MOBILE_ROOT, 'src', 'profile', 'TravelerDialog.tsx'),
    read(MOBILE_ROOT, 'src', 'diary', 'PostcardPreview.tsx'),
    read(MOBILE_ROOT, 'src', 'feed', 'FeedScreen.tsx'),
  ].join('\n');

  it.each(Object.keys(COMING_SOON_SURFACES))('%s has a call site', (surface) => {
    expect(screens).toMatch(new RegExp(`['"]${surface}['"]`));
  });
});
