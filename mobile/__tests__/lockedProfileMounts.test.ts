import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const SCREEN = read('src', 'profile', 'PublicProfileScreen.tsx');
const LISTS = read('src', 'profile', 'FollowListScreen.tsx');
const TRIP_DIARY = read('src', 'feed', 'PublicTripDiaryScreen.tsx');
const NOTICE = read('src', 'profile', 'LockedProfileNotice.tsx');


describe('the notice stands at all three of its hosts (S4.40 decisions 3 and 11)', () => {
  it('replaces the tabs on a locked profile', () => {
    expect(SCREEN).toContain('<LockedProfileNotice');
    expect(SCREEN).toContain('projection.showsNotice ? (');
  });

  it('replaces the retry on a gated follow list, in link mode', () => {
    expect(LISTS).toContain('<LockedProfileNotice');
    expect(LISTS).toContain('isProfilePrivate(list.error)');
    expect(LISTS).toContain('linked');
  });

  it('stands on a gated per-trip diary, under a header that still goes back', () => {
    expect(TRIP_DIARY).toContain('<LockedProfileNotice');
    expect(TRIP_DIARY).toContain('isProfilePrivate(diary.error)');
    expect(TRIP_DIARY).toContain('onPress={goBack}');
  });

  it('names the traveler and links to them, because the route carries their handle', () => {
    expect(TRIP_DIARY).toContain('linked={handle !== undefined');
    expect(TRIP_DIARY).not.toContain('displayName={author');
  });

  it('links nowhere rather than to a broken profile when no handle came with the route', () => {
    expect(TRIP_DIARY).toContain("handle === undefined || handle === ''");
  });

  it('leaves every other failure to the posture that already handles it', () => {
    expect(LISTS).toContain('FOLLOW_LIST_RETRY_LABEL');
    expect(TRIP_DIARY).toContain('itineraryLoadMessage');
  });

  it('branches on the error CODE, never on a status, at both gated hosts', () => {
    expect(LISTS).not.toContain('status === 403');
    expect(TRIP_DIARY).not.toContain('status === 403');
  });

  it('offers the traveler exactly one way onward, and no retry, in link mode', () => {
    expect(NOTICE).toContain('useOpenTravelerProfile');
    expect(NOTICE).not.toContain('refetch');
    expect(NOTICE).toContain("accessibilityRole=\"link\"");
  });

  it('asks for no diary or showcase on a locked page, so no fence is ever fetched', () => {
    expect(SCREEN).toContain('<PublicDiaryTab');
    const noticeAt = SCREEN.indexOf('<LockedProfileNotice');
    const diaryAt = SCREEN.indexOf('<PublicDiaryTab');
    expect(noticeAt).toBeLessThan(diaryAt);
  });
});
