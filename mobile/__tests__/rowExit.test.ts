import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const ROW = read('src', 'members', 'RowEntrance.tsx');
const REQUESTS = read('src', 'profile', 'FollowRequestsScreen.tsx');
const LISTS = read('src', 'profile', 'FollowListScreen.tsx');


describe('M3 — a decided row leaves rather than vanishing (S4.40 decision 16)', () => {
  it('fades and drops over the recorded duration, and only once it is told to leave', () => {
    expect(ROW).toContain('publicProfileMotion.rowExitMs');
    expect(ROW).toContain('publicProfileMotion.rowExitDropPx');
    expect(ROW).toContain('if (!leaving)');
  });

  it('is ONE animated view for both directions — two of them fight over the same row', () => {
    expect((ROW.match(/<Animated.View/g) ?? [])).toHaveLength(1);
    expect(LISTS).not.toContain('RowExit');
    expect(REQUESTS).not.toContain('RowExit');
    expect(existsSync(join(MOBILE_ROOT, 'src', 'members', 'RowExit.tsx'))).toBe(false);
  });

  it('stops re-running its entrance the moment a row starts leaving', () => {
    expect(ROW).toContain('if (leaving) {');
    expect(ROW.indexOf('if (leaving) {')).toBeLessThan(ROW.indexOf('progress.setValue(0)'));
  });

  it('reports gone only when the animation FINISHED, so a cancelled exit strands no row', () => {
    expect(ROW).toContain('({ finished })');
    expect(ROW).toContain('if (finished) gone.current?.()');
  });

  it('swaps opacity with no drop under Reduce Motion', () => {
    expect(ROW).toContain('useReducedMotion');
    expect(ROW).toContain('publicProfileMotion.reducedSwapMs');
    expect(ROW).toContain('reducedMotion ? 0 : travel');
  });

  it('stops taking presses the moment it starts leaving', () => {
    expect(ROW).toContain("pointerEvents={leaving ? 'none' : 'auto'}");
  });

  it('holds the latest callback, so a re-render mid-exit does not fire a stale one', () => {
    expect(ROW).toContain('gone.current = onGone');
  });
});


describe('the two lists that lose rows both play it', () => {
  it('the requests list decides only once the row has actually left', () => {
    expect(REQUESTS).toContain('leaving={item.traveler.id in leaving}');
    expect(REQUESTS).toContain('onGone={() =>');
    expect(REQUESTS).toContain('withDecision(held, item.traveler.id');
  });

  it('the requests list carries the REAL verdict through the exit, not a default', () => {
    expect(REQUESTS).toContain("{ ...held, [travelerId]: verdict }");
    expect(REQUESTS).toContain('leaving[item.traveler.id]');
  });

  it('a refused decision cancels the exit before it commits', () => {
    expect(REQUESTS).toContain('setLeaving(({ [travelerId]: _left, ...rest }) => rest)');
  });

  it('the followers list plays it too, and its count follows the leaving row', () => {
    expect(LISTS).toContain('leaving={leaving.includes(item.id)}');
    expect(LISTS).toContain('shownFollowCount(');
  });

  it('forgets a row once the server stops serving it, so nothing subtracts it twice', () => {
    expect(LISTS).toContain('stillThere.has(id)');
  });
});
