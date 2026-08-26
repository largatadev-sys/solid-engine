import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  PUBLISHED_STAT_LABEL,
} from '../src/profile/profileCopy';
import { AWAITING_COUNT, DESTINATIONS_STAT_LABEL } from '../src/profile/publicProfileCopy';

const MOBILE_ROOT = join(__dirname, '..');

const ROW = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'ProfileStatsRow.tsx'), 'utf8');
const SCREEN = readFileSync(
  join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'profile.tsx'),
  'utf8',
);


describe('the stats row: every cell is real or honestly empty', () => {
  it('draws the four cells in the mock order', () => {
    const cells = ROW.slice(ROW.indexOf('const cells = ['), ROW.indexOf('];'));
    const at = (label: string) => cells.indexOf(label);

    expect(at('PUBLISHED_STAT_LABEL')).toBeLessThan(at('DESTINATIONS_STAT_LABEL'));
    expect(at('DESTINATIONS_STAT_LABEL')).toBeLessThan(at('FOLLOWERS_STAT_LABEL'));
    expect(at('FOLLOWERS_STAT_LABEL')).toBeLessThan(at('FOLLOWING_STAT_LABEL'));
  });

  it('labels them the way the mock does', () => {
    expect([
      PUBLISHED_STAT_LABEL,
      DESTINATIONS_STAT_LABEL,
      FOLLOWERS_STAT_LABEL,
      FOLLOWING_STAT_LABEL,
    ]).toEqual(['Published', 'Destinations', 'Followers', 'Following']);
  });

  it('takes the two backed counts from the server and never invents them', () => {
    expect(SCREEN).toContain('publishedCount');
    expect(SCREEN).toContain('destinationCount');
    expect(ROW).not.toContain('Math.random');
  });

  it('shows no invented follow count on the own profile either, since S4.36 aligned the rows', () => {
    expect(ROW).not.toContain('stubFollowerCountFor');
    expect(ROW).not.toContain('stubFollowingCountFor');
    expect(ROW).toContain('{ label: FOLLOWERS_STAT_LABEL, value: null }');
    expect(ROW).toContain('{ label: FOLLOWING_STAT_LABEL, value: null }');
  });

  it('holds a count that has not arrived yet rather than rendering a wrong zero', () => {
    expect(ROW).toContain('cell.value ?? AWAITING_COUNT');
    expect(AWAITING_COUNT).toBe('—');
    expect(SCREEN).toContain('?? null');
  });

  it('makes no CELL tappable — the row reports, it does not navigate (spec mechanics)', () => {
    const cells = ROW.slice(ROW.indexOf('{cells.map('), ROW.indexOf('{stats.failed'));

    expect(cells).not.toContain('Pressable');
    expect(cells).not.toContain('onPress');
  });

  it('says so and offers a retry when the counts fail, rather than holding an em dash forever', () => {
    expect(ROW).toContain('stats.failed &&');
    expect(ROW).toContain('STATS_UNAVAILABLE');
    expect(ROW).toContain('onPress={stats.retry}');
    expect(SCREEN).toContain('failed: stats.isError');
    expect(SCREEN).toContain('stats.refetch()');
  });
});
