import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  forgetProfileView,
  isExpanded,
  selectTab,
  selectedTab,
  toggleExpanded,
} from '../src/profile/profileViewState';

const MOBILE_ROOT = join(__dirname, '..');

const TAB = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'ProfileDiaryTab.tsx'), 'utf8');
const POSTCARD = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'Postcard.tsx'), 'utf8');
const DIARY_STREAM = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'TripDiaryScreen.tsx'), 'utf8');

beforeEach(forgetProfileView);


describe('the profile view state survives the screen being unmounted beneath a push (S4.18)', () => {
  it('opens on the Diary tab', () => {
    expect(selectedTab()).toBe('diary');
  });

  it('remembers the tab the traveler chose, so opening a postcard does not reset it', () => {
    selectTab('itineraries');

    expect(selectedTab()).toBe('itineraries');
  });

  it('starts the newest trip expanded and every other one collapsed', () => {
    expect(isExpanded('trip-newest', true)).toBe(true);
    expect(isExpanded('trip-older', false)).toBe(false);
  });

  it('toggles a section and remembers it, in both directions', () => {
    toggleExpanded('trip-older', false);
    expect(isExpanded('trip-older', false)).toBe(true);

    toggleExpanded('trip-older', false);
    expect(isExpanded('trip-older', false)).toBe(false);
  });

  it('collapses the first section when the traveler asks, rather than re-defaulting it open', () => {
    toggleExpanded('trip-newest', true);

    expect(isExpanded('trip-newest', true)).toBe(false);
  });

  it('holds the expansion of each trip separately', () => {
    toggleExpanded('trip-older', false);

    expect(isExpanded('trip-older', false)).toBe(true);
    expect(isExpanded('trip-other', false)).toBe(false);
  });
});


describe('the Diary tab renders the diary as the mock groups it', () => {
  it('takes its sections from the existing my-diary-trips listing, unchanged', () => {
    expect(TAB).toContain('useMyDiaryTrips');
  });

  it('loads a trip-s postcards only once its section is open', () => {
    expect(TAB).toContain('useMyDiaryEntries(trip.itineraryId, open)');
  });

  it('expands the first section and leaves the rest closed', () => {
    expect(TAB).toContain('first={index === 0}');
    expect(TAB).toContain('isExpanded(trip.itineraryId, first)');
  });

  it('rotates the mock-s chevron rather than swapping a glyph', () => {
    expect(TAB).toContain("rotate: '45deg'");
    expect(TAB).toContain("rotate: '-45deg'");
  });

  it('opens the postcard preview on tap, and reaches the editor through it (the founder-s second frame)', () => {
    expect(TAB).toContain('<PostcardPreview');
    expect(TAB).toContain('setPreviewing(entry)');
    expect(TAB).toContain("entryEditorRoute('profile', trip.itineraryId, entry.id)");
  });

  it('navigates the section row to that trip-s diary while the chevron still expands it (founder, 08/12)', () => {
    expect(TAB).toContain("pathname: '/diary/[id]'");
    expect(TAB).toContain('Open the diary for');
    expect(TAB).toContain('onPress={toggle}');
  });

  it('opens it inside the PROFILE stack, so back returns here rather than into Trips (S4.13)', () => {
    expect(TAB).not.toContain('/itineraries/[id]/diary/[entryId]');
    expect(
      existsSync(join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'diary', '[id]', '[entryId].tsx')),
    ).toBe(true);
  });

  it('leaves the trip stack its own route to the same screen, so the diary stream is unmoved', () => {
    expect(
      existsSync(
        join(MOBILE_ROOT, 'app', '(tabs)', '(trips)', 'itineraries', '[id]', 'diary', '[entryId].tsx'),
      ),
    ).toBe(true);
  });

  it('exits to the stack it was opened from, never across (S4.13)', () => {
    const profileRoute = readFileSync(
      join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'diary', '[id]', '[entryId].tsx'),
      'utf8',
    );

    expect(profileRoute).toContain('profileStackExit(from)');
  });

  it('gives the trip diary its own exit, so a save returns to the stream rather than the tab', () => {
    const tripDiaryRoute = readFileSync(
      join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'diary', '[id]', 'index.tsx'),
      'utf8',
    );

    expect(tripDiaryRoute).toContain('exit="tripDiary"');
  });

  it('takes its likes from the stub module and nowhere else', () => {
    expect(TAB).toContain('stubLikeCount()');
    expect(TAB).not.toContain('Math.random');
    expect(POSTCARD).not.toContain('Math.random');
  });
});


describe('the postcard the profile draws, per the mock', () => {
  it('takes likes as an optional prop, so only this surface wears them', () => {
    expect(POSTCARD).toContain('likes?: number | null');
    expect(POSTCARD).toContain('likes = null');
  });

  it('renders no likes row at all when it is given none — the switch-off shape', () => {
    expect(POSTCARD).toContain('likes !== null &&');
  });

  it('shows the counter and dots only for a postcard with more than one photo', () => {
    expect(POSTCARD).toContain('showsCarouselChrome(photoCount)');
    expect(POSTCARD).toContain('chrome &&');
  });

  it('keeps the day-and-time badge from being squeezed out by a long title (S3.1)', () => {
    const badge = POSTCARD.slice(POSTCARD.indexOf('badge: {'), POSTCARD.indexOf('badgeLabel:'));

    expect(badge).toContain('flexShrink: 0');
    expect(POSTCARD).toContain('numberOfLines={1}');
  });
});


describe('the trip diary stream wears the founder-s frame-1 anatomy (08/12 mock)', () => {
  it('renders its entries inline on its own anatomy, not as profile postcards', () => {
    expect(DIARY_STREAM).toContain('snapshotEyebrow');
    expect(DIARY_STREAM).not.toContain('<Postcard ');
  });

  it('draws the mock-s stream photo, edge-to-edge past the screen inset', () => {
    expect(DIARY_STREAM).toContain('diaryScreenMetrics.streamPhotoWidth');
    expect(DIARY_STREAM).toContain('diaryScreenMetrics.streamPhotoHeight');
    expect(DIARY_STREAM).toContain('marginHorizontal: -STREAM_INSET');
  });

  it('opens the postcard preview on an entry tap rather than pushing the editor', () => {
    expect(DIARY_STREAM).toContain('<PostcardPreview');
    expect(DIARY_STREAM).toContain('setPreviewing(entry)');
  });

  it('omits the caption entirely when the entry has none, rather than drawing an empty line', () => {
    expect(DIARY_STREAM).toContain('entry.caption !== null &&');
  });

  it('wears no likes row — the stubs live on the profile only', () => {
    expect(DIARY_STREAM).not.toContain('stubLikeCount');
    expect(DIARY_STREAM).not.toContain('likes');
  });
});
