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
    expect(SCREEN).toContain('feed.isError ? <FeedLoadFailed');
  });
});


describe('the Trip Post badge is a door out, so it is absent where it leads nowhere', () => {
  const DIARY = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'PublicTripDiaryScreen.tsx'), 'utf8');

  it('renders on a card only when a handler was given', () => {
    expect(CARD).toContain('{onOpenTripDiary !== undefined && (');
    expect(CARD).toContain('readonly onOpenTripDiary?:');
  });

  it('is offered by the feed, where it goes somewhere', () => {
    expect(SCREEN).toContain('onOpenTripDiary={openTripDiary}');
  });

  it('is withheld inside the trip diary, which is where it would have led', () => {
    expect(DIARY).not.toContain('onOpenTripDiary');
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
