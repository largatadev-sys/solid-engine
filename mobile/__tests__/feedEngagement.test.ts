import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOUBLE_TAP_MS, isDoubleTap, isTap, TAP_SLOP } from '../src/feed/doubleTap';
import { burstLiked, likeStateFrom, toggled } from '../src/feed/likeState';

const MOBILE_ROOT = join(__dirname, '..');
const CARD = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'FeedCard.tsx'), 'utf8');
const SCREEN = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'FeedScreen.tsx'), 'utf8');

const AT = 10_000;

const point = (x: number, y: number, at: number) => ({ x, y, at });


describe('the heart toggles, and the burst only ever likes', () => {
  it('starts un-liked over whatever base the stub drew', () => {
    expect(likeStateFrom(142)).toEqual({ liked: false, count: 142 });
  });

  it('adds one on the way up and takes it back on the way down', () => {
    const liked = toggled(likeStateFrom(142));
    expect(liked).toEqual({ liked: true, count: 143 });
    expect(toggled(liked)).toEqual({ liked: false, count: 142 });
  });

  it('never shows a negative count, however the base arrived', () => {
    expect(toggled({ liked: true, count: 0 })).toEqual({ liked: false, count: 0 });
  });

  it('is IDEMPOTENT on double-tap — a second burst replays but never unlikes (behavior card 2)', () => {
    const once = burstLiked(likeStateFrom(7));
    const twice = burstLiked(once);

    expect(once).toEqual({ liked: true, count: 8 });
    expect(twice).toEqual({ liked: true, count: 8 });
  });

  it('leaves only the heart button able to turn a like off', () => {
    const bursted = burstLiked(likeStateFrom(7));
    expect(toggled(bursted).liked).toBe(false);
  });
});


describe('double-tap detection must not steal a swipe', () => {
  it('treats two quick taps in the same place as a double tap', () => {
    expect(isDoubleTap(point(100, 200, AT), point(102, 201, AT + 180))).toBe(true);
  });

  it('is not fooled by two taps too far apart in time', () => {
    expect(isDoubleTap(point(100, 200, AT), point(100, 200, AT + DOUBLE_TAP_MS + 1))).toBe(false);
  });

  it('is not fooled by two taps too far apart on screen', () => {
    expect(isDoubleTap(point(100, 200, AT), point(100 + TAP_SLOP + 1, 200, AT + 100))).toBe(false);
  });

  it('has nothing to compare against on the very first tap', () => {
    expect(isDoubleTap(null, point(100, 200, AT))).toBe(false);
  });

  it('calls anything that moved more than the slop a swipe, not a tap (behavior card 2)', () => {
    expect(isTap(point(100, 200, AT), point(109, 200, AT + 50))).toBe(true);
    expect(isTap(point(100, 200, AT), point(111, 200, AT + 50))).toBe(false);
    expect(isTap(point(100, 200, AT), point(100, 211, AT + 50))).toBe(false);
  });
});


describe('the chrome is wired the way the mock and the kill-switch require', () => {
  it('draws the heart and comment from the memoised stub, never a fresh draw per render', () => {
    expect(CARD).toContain('stubLikeCountFor(card.id)');
    expect(CARD).toContain('stubCommentCountFor(card.id)');
    expect(CARD).not.toContain('Math.random');
  });

  it('hides the whole engagement row when the kill-switch is off, rather than showing zeroes', () => {
    expect(CARD).toContain('{like !== null && (');
  });

  it('compacts counts past 999 on the card itself', () => {
    expect(CARD).toContain('compactCount(like.count)');
  });

  it('refuses every backendless control through the shared helper', () => {
    for (const stub of ['comment', 'share', 'save', 'photoSheet']) {
      expect(CARD).toContain(`'${stub}'`);
    }
    expect(SCREEN).toContain("comingSoon('comments')");
    expect(SCREEN).toContain("comingSoon('share')");
    expect(SCREEN).toContain("comingSoon('saved')");
    expect(SCREEN).toContain("comingSoon('report')");
  });

  it('routes the byline to the real profile rather than refusing it (S4.36 ticket 05)', () => {
    expect(CARD).toContain('onOpenAuthor(card)');
    expect(CARD).not.toContain("'author'");
    expect(SCREEN).toContain('onOpenAuthor={(card) => openProfile(card.author.handle)}');
    expect(SCREEN).not.toContain("comingSoon('profile')");
  });

  it('long-presses the photo into the quick-action sheet rather than doing nothing', () => {
    expect(CARD).toContain("onLongPress={() => onStubTap('photoSheet')}");
  });

  it('opens the mock-s three-action sheet, so each action refuses under its own name', () => {
    const sheet = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'PhotoActionSheet.tsx'), 'utf8');

    expect(sheet).toContain('PHOTO_SHEET_SAVE');
    expect(sheet).toContain('PHOTO_SHEET_SHARE');
    expect(sheet).toContain('PHOTO_SHEET_REPORT');
    expect(SCREEN).toContain('setSheetOpen(true)');
    expect(SCREEN).toContain("if (action === 'save') comingSoon('saved');");
    expect(SCREEN).toContain("else comingSoon('report');");
  });

  it('makes the location tag tappable only where the trip line is, without dimming it', () => {
    expect(CARD).toContain('navigates ? (');
    expect(CARD).not.toContain('styles.tagInert');
    expect(CARD).not.toContain('styles.tripLineInert');
  });

  it('never dims the trip line or the pin — publication is not the card-s to signal', () => {
    const tripLine = CARD.slice(CARD.indexOf('{line !== null &&'), CARD.indexOf('<View style={styles.badge}'));
    const tag = CARD.slice(CARD.indexOf('{card.place !== null &&'), CARD.indexOf('{card.caption !== null'));

    expect(tripLine.match(/styles\.tripLine\b/g) ?? []).toHaveLength(2);
    expect(tag.match(/feedColors\.tagInk/g) ?? []).toHaveLength(2);
    expect(tag.match(/styles\.tagLabel\b/g) ?? []).toHaveLength(2);
  });

  it('puts the PLACE behind the pin, never the activity title (founder, 2026-08-12)', () => {
    const tag = CARD.slice(CARD.indexOf('{card.place !== null &&'), CARD.indexOf('{card.caption !== null'));

    expect(tag).toContain('{card.place}');
    expect(tag).not.toContain('{card.activityTitle}');
  });

  it('hides the pin entirely when the activity had no place — never a bare glyph', () => {
    expect(CARD).toContain('{card.place !== null && (');
  });

  it('offers "more" only once the caption is measured as overflowing', () => {
    expect(CARD).toContain('{overflows && !expanded && (');
    expect(CARD).not.toContain('{!expanded && (');
  });

  it('pads every icon target past the thumb minimum', () => {
    expect(CARD).toContain('HIT_SLOP');
  });
});
