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
const CELLS = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'StatCells.tsx'), 'utf8');
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

  it('takes the follow counts from the server too, and still invents nothing (S4.37)', () => {
    expect(ROW).not.toContain('stubFollowerCountFor');
    expect(ROW).not.toContain('stubFollowingCountFor');
    expect(ROW).toContain('{ label: FOLLOWERS_STAT_LABEL, value: stats.followers');
    expect(ROW).toContain('{ label: FOLLOWING_STAT_LABEL, value: stats.following');
    expect(SCREEN).toContain('followers: stats.data?.followersCount ?? null');
    expect(SCREEN).toContain('following: stats.data?.followingCount ?? null');
  });

  it('holds a count that has not arrived yet rather than rendering a wrong zero', () => {
    expect(CELLS).toContain('cell.value ?? AWAITING_COUNT');
    expect(AWAITING_COUNT).toBe('—');
    expect(SCREEN).toContain('?? null');
  });

  it('makes the two follow cells tappable and leaves the other two inert (S4.37, C4)', () => {
    expect(ROW).toContain('{ label: FOLLOWERS_STAT_LABEL, value: stats.followers, open: stats.openFollowers }');
    expect(ROW).toContain('{ label: FOLLOWING_STAT_LABEL, value: stats.following, open: stats.openFollowing }');
    expect(ROW).toContain('{ label: PUBLISHED_STAT_LABEL, value: stats.published, open: null }');
    expect(ROW).toContain('{ label: DESTINATIONS_STAT_LABEL, value: stats.destinations, open: null }');
    expect(CELLS).toContain('if (cell.open === null)');
  });

  it('draws both rows from ONE cell component, so the two can never drift apart', () => {
    const HEADER = readFileSync(
      join(MOBILE_ROOT, 'src', 'profile', 'PublicProfileHeader.tsx'),
      'utf8',
    );

    expect(ROW).toContain('<StatCells cells={cells} />');
    expect(HEADER).toContain('<StatCells cells={cells} />');
  });

  it('opens each list against the traveler\'s own handle', () => {
    expect(SCREEN).toContain('followersRoute(myHandle)');
    expect(SCREEN).toContain('followingRoute(myHandle)');
  });

  it('says so and offers a retry when the counts fail, rather than holding an em dash forever', () => {
    expect(ROW).toContain('stats.failed &&');
    expect(ROW).toContain('STATS_UNAVAILABLE');
    expect(ROW).toContain('onPress={stats.retry}');
    expect(SCREEN).toContain('failed: stats.isError');
    expect(SCREEN).toContain('stats.refetch()');
  });
});
