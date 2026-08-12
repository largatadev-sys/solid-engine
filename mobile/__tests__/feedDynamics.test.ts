import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { atTop, HEADER_SHOWING, HIDE_AFTER, onScroll } from '../src/feed/headerVisibility';
import { freshCount, POLL_MS, showsPill } from '../src/feed/freshPosts';
import { homeTabRetapped, onHomeTabRetap } from '../src/feed/homeTabRetap';

const MOBILE_ROOT = join(__dirname, '..');
const SCREEN = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'FeedScreen.tsx'), 'utf8');


function scrollThrough(...positions: number[]) {
  return positions.reduce((state, y) => onScroll(state, y), HEADER_SHOWING);
}


describe('the header hides going down and returns going up (behavior card 4)', () => {
  it('stays put through the first pixels — a nudge is not a scroll', () => {
    expect(scrollThrough(6).hidden).toBe(false);
    expect(scrollThrough(HIDE_AFTER).hidden).toBe(false);
  });

  it('hides once the traveler is past the threshold AND moving down', () => {
    expect(scrollThrough(20, 40).hidden).toBe(true);
  });

  it('needs BOTH — a big jump that lands above the threshold does not hide it', () => {
    expect(onScroll({ hidden: false, lastY: 0 }, HIDE_AFTER).hidden).toBe(false);
  });

  it('returns on the first real upward movement, wherever it happens', () => {
    const hidden = scrollThrough(20, 400);
    expect(hidden.hidden).toBe(true);
    expect(onScroll(hidden, 380).hidden).toBe(false);
  });

  it('does not flap on jitter around the threshold', () => {
    const settled = scrollThrough(20, 40, 43, 41, 44, 42);
    expect(settled.hidden).toBe(true);
  });

  it('is always showing again once the traveler is back at the top', () => {
    const hidden = scrollThrough(20, 400);
    expect(onScroll(hidden, 0).hidden).toBe(false);
    expect(atTop(0)).toBe(true);
    expect(atTop(400)).toBe(false);
  });

  it('tracks the last position on every event, so the next delta is honest', () => {
    expect(onScroll(HEADER_SHOWING, 137).lastY).toBe(137);
  });
});


describe('the new-posts pill offers rather than yanks (behavior card 5)', () => {
  it('counts only ids the feed is not already showing', () => {
    expect(freshCount(['c', 'b', 'a'], ['b', 'a'])).toBe(1);
    expect(freshCount(['b', 'a'], ['b', 'a'])).toBe(0);
  });

  it('claims nothing fresh before the feed has loaded — everything would look new', () => {
    expect(freshCount(['a', 'b'], [])).toBe(0);
  });

  it('appears only while scrolled down, so it never covers what is being read at the top', () => {
    expect(showsPill(2, true)).toBe(true);
    expect(showsPill(2, false)).toBe(false);
    expect(showsPill(0, true)).toBe(false);
  });

  it('polls about once a minute — cheap, and not a notifications system', () => {
    expect(POLL_MS).toBe(60_000);
  });
});


describe('the Home tab re-tap seam', () => {
  it('hands the tap to whoever is listening, and stops when they leave', () => {
    let taps = 0;
    const stop = onHomeTabRetap(() => {
      taps += 1;
    });

    homeTabRetapped();
    expect(taps).toBe(1);

    stop();
    homeTabRetapped();
    expect(taps).toBe(1);
  });

  it('is harmless when nothing is listening', () => {
    expect(() => homeTabRetapped()).not.toThrow();
  });
});


describe('the screen wires the dynamics the way the mock describes', () => {
  it('scrolls to the top when scrolled, and refreshes when already there', () => {
    expect(SCREEN).toContain('if (atTop(offset.current))');
    expect(SCREEN).toContain('toTop(true)');
  });

  it('moves the header by transform rather than by unmounting it', () => {
    expect(SCREEN).toContain('translateY: slide');
    expect(SCREEN).toContain('-feedMetrics.headerHeight');
  });

  it('never moves scroll on the poll — the pill is the only door', () => {
    const poll = SCREEN.slice(SCREEN.indexOf('const tick = setInterval'), SCREEN.indexOf('const pageOf'));
    expect(poll).toContain('setFresh');
    expect(poll).not.toContain('scrollToOffset');
    expect(poll).not.toContain('toTop');
  });

  it('arms the poll ONCE and reads the shown ids at fire time, never restarting the timer', () => {
    const armed = SCREEN.slice(SCREEN.indexOf('const tick = setInterval'));
    const deps = armed.slice(armed.indexOf('clearInterval'), armed.indexOf('const pageOf'));

    expect(deps).toContain('}, []);');
    expect(armed).toContain('known.current');
    expect(SCREEN).not.toContain('}, [shownIds]);');
  });

  it('toasts only when a refresh brought nothing new, on EVERY path that refreshes', () => {
    expect(SCREEN).toContain('if (toastWhenNothingNew && after <= had)');
    expect(SCREEN).toContain('FEED_REFRESHED_TOAST');
    expect(SCREEN.match(/setToast\(FEED_REFRESHED_TOAST\)/g) ?? []).toHaveLength(1);
  });

  it('takes the fresh posts WITHOUT claiming there were none', () => {
    const takes = SCREEN.slice(SCREEN.indexOf('const takeTheFreshPosts'), SCREEN.indexOf('const reachedTheEnd'));
    expect(takes).toContain('refresh(false)');
  });
});
