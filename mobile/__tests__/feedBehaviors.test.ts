import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDoubleTap } from '../src/feed/doubleTap';
import { SNAP_STYLE } from '../src/diary/photoStripScroll.web';

const MOBILE_ROOT = join(__dirname, '..');
const CARD = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'FeedCard.tsx'), 'utf8');
const SCREEN = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'FeedScreen.tsx'), 'utf8');


describe('B1.3 — the ends rubber-band without dragging the feed with them', () => {
  it('contains the horizontal overscroll rather than chaining it outward', () => {
    expect(SNAP_STYLE.overscrollBehaviorX).toBe('contain');
  });

  it('keeps the snap that web paging depends on', () => {
    expect(SNAP_STYLE.scrollSnapType).toBe('x mandatory');
  });
});


describe('B1.10 — a card remembers its page while it is off-screen', () => {
  it('holds the page map on the SCREEN, not the row, so recycling cannot lose it', () => {
    expect(SCREEN).toContain('const pages = useRef(new Map<string, number>())');
    expect(SCREEN).toContain('pages.current.get(cardId)');
    expect(CARD).not.toContain('useState(0)\n  const [page');
  });

  it('keys the map by card id rather than list index, which shifts as pages merge', () => {
    expect(SCREEN).toContain('rememberPage(item.id, page)');
    expect(SCREEN).toContain('pageOf(item.id)');
  });
});


describe('B2.6 — a single tap on the photo does nothing', () => {
  it('cannot be a double tap when there is no previous tap to pair with', () => {
    expect(isDoubleTap(null, { x: 10, y: 10, at: 1_000 })).toBe(false);
  });

  it('only records the tap and returns — no like, no navigation, no burst', () => {
    const handler = CARD.slice(CARD.indexOf('const photoTapped'), CARD.indexOf('const photoCount'));

    expect(handler).toContain('lastTap.current = point;');
    expect(handler).not.toContain('router');
    expect(handler.match(/burstLike\(\)/g) ?? []).toHaveLength(1);
    expect(handler.indexOf('burstLike()')).toBeLessThan(handler.indexOf('lastTap.current = point;'));
  });
});


describe('B5.5 — a page failure shows the inline row, never a full-screen error', () => {
  it('renders the retry row in the FOOTER, where it cannot displace the feed', () => {
    const footer = SCREEN.slice(SCREEN.indexOf('function FeedFooter'), SCREEN.length);

    expect(footer).toContain('if (failed) {');
    expect(footer).toContain('<FeedRetryRow onRetry={onRetry} />');
  });

  it('reserves the full-screen state for a first load that failed with nothing to show', () => {
    expect(SCREEN).toContain('cards.length === 0 ? null : (');
    expect(SCREEN).toContain('feed.isError ? (');
    expect(SCREEN).toContain('<FeedLoadFailed onRetry={() => refresh(false)} />');
  });
});


describe('an empty page with a cursor is not an empty feed', () => {
  it('withholds the empty state while the stream still has pages', () => {
    expect(SCREEN).toContain('feed.hasNextPage === true ? null : (');
    expect(SCREEN).toContain('<FeedEmptyState />');
  });

  it('pulls the next page itself, because FlatList fires no onEndReached on an empty list', () => {
    const puller = SCREEN.slice(SCREEN.indexOf('cards.length === 0 && feed.hasNextPage'), SCREEN.length);

    expect(puller).toContain('void feed.fetchNextPage();');
    expect(puller.slice(0, 200)).toContain('!feed.isFetchingNextPage');
    expect(puller.slice(0, 200)).toContain('!feed.isPending');
  });
});


describe('the Trip Post badge lands on the diary as it already looks, not a feed restyle', () => {
  const DIARY = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'PublicTripDiaryScreen.tsx'), 'utf8');
  const MY_DIARY = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'TripDiaryScreen.tsx'), 'utf8');

  it('draws the same postcard stream the author sees, from one component', () => {
    expect(DIARY).toContain('<PostcardStreamEntry');
    expect(MY_DIARY).toContain('<PostcardStreamEntry');
    expect(DIARY).not.toContain('FeedCard');
  });

  it('wears the diary chrome, never the feed surface it was reached from', () => {
    expect(DIARY).toContain('backgroundColor: diaryScreenColors.card');
    expect(DIARY).not.toContain('feedColors.cardSurface');
    expect(DIARY).not.toContain('feedMetrics.cardGap');
  });

  it('feeds the row only what a reader may see, so it cannot reach for an author field', () => {
    const ENTRY = readFileSync(
      join(MOBILE_ROOT, 'src', 'diary', 'PostcardStreamEntry.tsx'),
      'utf8',
    );

    expect(ENTRY).toContain('readonly postcard: StreamPostcard;');
    expect(ENTRY).not.toContain('DiaryEntryResponse');
  });

  it('opens the same preview on tap, with Edit withheld from a reader', () => {
    expect(DIARY).toContain('<PostcardPreview');
    expect(DIARY).not.toContain('onEdit');
    expect(MY_DIARY).toContain('onEdit={(entry) => {');
  });
});


describe('B6.7 — "more" expands in place', () => {
  it('grows the card by dropping the line clamp, and navigates nowhere', () => {
    const caption = CARD.slice(CARD.indexOf('{card.caption !== null'), CARD.indexOf('<View style={styles.engagement}'));

    expect(caption).toContain('numberOfLines={expanded ? undefined : CAPTION_LINES}');
    expect(caption).toContain('onPress={() => setExpanded(true)}');
    expect(caption).not.toContain('router');
    expect(caption).not.toContain('onOpenTrip');
  });

  it('is one-way — nothing re-clamps a caption the traveler chose to open', () => {
    expect(CARD).not.toContain('setExpanded(false)');
  });
});
