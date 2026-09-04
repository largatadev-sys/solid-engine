import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const EXIT = read('src', 'members', 'RowExit.tsx');
const REQUESTS = read('src', 'profile', 'FollowRequestsScreen.tsx');
const LISTS = read('src', 'profile', 'FollowListScreen.tsx');


describe('M3 — a decided row leaves rather than vanishing (S4.40 decision 16)', () => {
  it('fades and drops over the recorded duration, and only once it is told to leave', () => {
    expect(EXIT).toContain('publicProfileMotion.rowExitMs');
    expect(EXIT).toContain('publicProfileMotion.rowExitDropPx');
    expect(EXIT).toContain('if (!leaving)');
  });

  it('reports gone only when the animation FINISHED, so a cancelled exit strands no row', () => {
    expect(EXIT).toContain('({ finished })');
    expect(EXIT).toContain('if (finished) gone.current()');
  });

  it('swaps opacity with no drop under Reduce Motion', () => {
    expect(EXIT).toContain('useReducedMotion');
    expect(EXIT).toContain('publicProfileMotion.reducedSwapMs');
    expect(EXIT).toContain('reducedMotion ? 0 : dropPx');
  });

  it('stops taking presses the moment it starts leaving', () => {
    expect(EXIT).toContain("pointerEvents={leaving ? 'none' : 'auto'}");
  });

  it('holds the latest callback, so a re-render mid-exit does not fire a stale one', () => {
    expect(EXIT).toContain('gone.current = onGone');
  });
});


describe('the two lists that lose rows both play it', () => {
  it('the requests list decides only once the row has actually left', () => {
    expect(REQUESTS).toContain('<RowExit');
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
    expect(LISTS).toContain('<RowExit');
    expect(LISTS).toContain('- leaving.length');
  });
});
