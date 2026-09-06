import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMING_SOON_SURFACES } from '../src/components/comingSoonMessage';
import { DIARIES_STAT_LABEL, ITINERARIES_STAT_LABEL } from '../src/diary/memoryCopy';
import { FOLLOW_LABEL } from '../src/profile/publicProfileCopy';
import { FOLLOWERS_STAT_LABEL, FOLLOWING_STAT_LABEL } from '../src/profile/profileCopy';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const HEADER = read('src', 'profile', 'PublicProfileHeader.tsx');
const PILL = read('src', 'profile', 'FollowPill.tsx');
const PILL_HOOK = read('src', 'profile', 'useFollowPill.ts');
const SCREEN = read('src', 'profile', 'PublicProfileScreen.tsx');
const DIARY = read('src', 'diary', 'MemoryDiaryTab.tsx');
const ITINERARIES = read('src', 'profile', 'PublicItinerariesTab.tsx');
const OWN_HEADER = read('src', 'profile', 'ProfileHeader.tsx');


describe('the three deltas the canvas draws on someone else\'s profile', () => {
  it('carries the four-cell row in the order the canvas draws it', () => {
    const cells = HEADER.slice(HEADER.indexOf('const cells = ['), HEADER.indexOf('];'));
    const at = (label: string) => cells.indexOf(label);

    expect(at('DIARIES_STAT_LABEL')).toBeGreaterThanOrEqual(0);
    expect(at('DIARIES_STAT_LABEL')).toBeLessThan(at('ITINERARIES_STAT_LABEL'));
    expect(at('ITINERARIES_STAT_LABEL')).toBeLessThan(at('FOLLOWERS_STAT_LABEL'));
    expect(at('FOLLOWERS_STAT_LABEL')).toBeLessThan(at('FOLLOWING_STAT_LABEL'));
    expect(DIARIES_STAT_LABEL).toBe('Diaries');
    expect(ITINERARIES_STAT_LABEL).toBe('Itineraries');
  });

  it('reads the same Diary tab the owner does, without the owner acts (CM-2, founder ruling 2026-09-06)', () => {
    expect(SCREEN).toContain('<MemoryDiaryTab');
    expect(SCREEN).toContain('owned={false}');
    expect(SCREEN).toContain('useDiarySections(isSelf ? null : subject)');
    expect(SCREEN).not.toContain('PublicDiaryTab');
    expect(DIARY).toContain('onMenu={');
    expect(DIARY).toContain('owned && onDiaryMenu !== undefined');
  });

  it('never shows the private trip count, which includes trips a stranger cannot see', () => {
    const cells = HEADER.slice(HEADER.indexOf('const cells = ['), HEADER.indexOf('];'));

    expect(cells).not.toContain('TRIPS_STAT_LABEL');
  });

  it('numbers the follow counts from the server now that the graph is real (S4.37)', () => {
    expect(HEADER).toContain('{ label: FOLLOWERS_STAT_LABEL, value: followersCount');
    expect(HEADER).toContain('{ label: FOLLOWING_STAT_LABEL, value: followingCount');
    expect(HEADER).not.toContain('AWAITING_COUNT');
    expect(SCREEN).toContain('followersCount={shown?.followersCount');
    expect(SCREEN).toContain('followersCount=');
    expect(SCREEN).toContain('followingCount={profile.data.followingCount}');
    expect(FOLLOWERS_STAT_LABEL).toBe('Followers');
    expect(FOLLOWING_STAT_LABEL).toBe('Following');
  });

  it('opens the matching list from each follow cell, and leaves the other two inert (C4)', () => {
    expect(HEADER).toContain('open: onOpenFollowers');
    expect(HEADER).toContain('open: onOpenFollowing');
    expect(HEADER).toContain('{ label: DIARIES_STAT_LABEL, value: diaryCount, open: null }');
    expect(HEADER).toContain('{ label: ITINERARIES_STAT_LABEL, value: itineraryCount, open: null }');
    expect(SCREEN).toContain('followersRoute(subject)');
    expect(SCREEN).toContain('followingRoute(subject)');
  });

  it('shows no invented number about a real person — no stub metric reaches this surface', () => {
    for (const source of [HEADER, SCREEN, DIARY, ITINERARIES]) {
      expect(source).not.toContain('stubMetrics');
      expect(source).not.toContain('stubFollowerCountFor');
      expect(source).not.toContain('stubLikeCountFor');
      expect(source).not.toContain('stubRatingFor');
      expect(source).not.toContain('stubPricePerPersonFor');
    }
  });

  it('has no cogwheel and no Edit affordance anywhere — settings are the owner\'s', () => {
    for (const source of [HEADER, SCREEN]) {
      expect(source).not.toContain('EDIT_PROFILE_LABEL');
      expect(source).not.toContain('ACCOUNT_LABEL');
      expect(source).not.toContain("name=\"settings\"");
    }
  });

  it('puts the Follow pill in the slot the own profile gives Edit', () => {
    expect(HEADER).toContain('<FollowPill');
    expect(HEADER.indexOf('<FollowPill')).toBeGreaterThan(HEADER.indexOf('<StatCells'));
    expect(read('src', 'profile', 'FollowPill.tsx')).toContain(FOLLOW_LABEL);
  });
});


describe('the own Profile tab is untouched by the projection', () => {
  it('still carries its cogwheel, its Edit pill and its four-cell stats row', () => {
    expect(OWN_HEADER).toContain('EDIT_PROFILE_LABEL');
    expect(OWN_HEADER).toContain('ACCOUNT_LABEL');
    expect(OWN_HEADER).toContain('<ProfileStatsRow');
  });
});


describe('C1 and M1 — the pill now has three states (S4.40)', () => {
  it('renders the Following treatment with its leading check (C2)', () => {
    expect(PILL).toContain('followPillTreatment(relation)');
    expect(PILL).toContain('treatment.glyph &&');
    expect(PILL).toContain('name="check"');
  });

  it('crossfades fill, border and label rather than swapping them (M1)', () => {
    expect(PILL).toContain('pillCrossfadeMs');
    expect(PILL).toContain('backgroundColor: fill.interpolate');
    expect(PILL).toContain('borderColor: fill.interpolate');
  });

  it('drops the scale under Reduce Motion and shortens the crossfade', () => {
    expect(PILL).toContain('useReducedMotion');
    expect(PILL).toContain('reducedSwapMs');
    expect(PILL).toContain('reducedMotion ? null : press.style');
  });

  it('flips the screen before the server answers, and reverts with a toast on failure (C1)', () => {
    expect(PILL_HOOK).toContain('tapped(before)');
    expect(PILL_HOOK).toContain('setFollow(next.state)');
    expect(PILL_HOOK).toContain('setFollow(reverted(before))');
    expect(PILL_HOOK).toContain('followToastFor');
    expect(SCREEN).not.toContain("comingSoon('follow')");
  });

  it('asks nobody to confirm an unfollow, and swallows taps already in flight', () => {
    expect(SCREEN).not.toContain('confirmDestructive');
    expect(PILL_HOOK).toContain('if (intent === null)');
  });

  it('writes through the repository layer, never a raw call from the screen (ADR-001)', () => {
    expect(PILL_HOOK).toContain('useFollowMutation');
    expect(SCREEN).not.toContain('apiClient');
    expect(PILL_HOOK).not.toContain('apiClient');
  });
});


describe('the named deviation from the frame', () => {
  it('ships the postcard card without the likes row — no real count exists yet', () => {
    expect(DIARY).toContain('<LooseCard');
    expect(DIARY).not.toMatch(/\blikes?\b/i);
    expect(DIARY).not.toContain('comment');
  });
});


describe('the freshness lane (the 2026-08-25 rule): focus-fresh pull, never a socket', () => {
  it('revalidates each read on focus through the shared helper', () => {
    expect(SCREEN).toContain('useRevalidateOnFocus(profile');
    expect(SCREEN).toContain('useRevalidateOnFocus(sections');
    expect(ITINERARIES).toContain('useRevalidateOnFocus(published)');
  });

  it('opens no subscription — a public feed\'s audience is every online traveler', () => {
    for (const source of [SCREEN, DIARY, ITINERARIES]) {
      expect(source).not.toContain('useTopic');
      expect(source).not.toContain('subscribe');
      expect(source).not.toContain('/ws');
    }
  });
});


describe('the profile refusal is gone from the product, dead copy and all', () => {
  it('retires the coming-soon surface rather than leaving it unreferenced', () => {
    expect(COMING_SOON_SURFACES).not.toHaveProperty('profile');
  });

  it('leaves no author tap refusing anywhere', () => {
    for (const path of [
      ['src', 'discovery', 'DiscoveryCard.tsx'],
      ['src', 'feed', 'FeedScreen.tsx'],
      ['src', 'itineraries', 'PublishedItineraryView.tsx'],
      ['src', 'profile', 'TravelerDialog.tsx'],
    ]) {
      expect(read(...path)).not.toContain("comingSoon('profile')");
    }
  });

  it('routes each of the four entry points through the one shared destination rule', () => {
    for (const path of [
      ['src', 'discovery', 'DiscoveryCard.tsx'],
      ['src', 'feed', 'FeedScreen.tsx'],
      ['src', 'itineraries', 'PublishedItineraryView.tsx'],
      ['src', 'profile', 'TravelerDialog.tsx'],
    ]) {
      expect(read(...path)).toContain('useOpenTravelerProfile');
    }
  });
});


describe('the motion contract (M2-M4), with M5 normative', () => {
  const SEARCH = read('src', 'discovery', 'DiscoverySearchScreen.tsx');
  const RESULTS = read('src', 'discovery', 'PeopleResultsScreen.tsx');

  it('rises the incoming tab panel rather than swapping it (M2)', () => {
    expect(SCREEN).toContain('<RowEntrance');
    expect(SCREEN).toContain('publicProfileMotion.panelRiseMs');
    expect(SCREEN).toContain('publicProfileMotion.panelRisePx');
  });

  it('rotates the section chevron rather than flipping it (M2)', () => {
    expect(DIARY).toContain('memoryMotion.chevronTurnMs');
    expect(DIARY).toContain('turn.interpolate');
  });

  it('staggers the suggestion rows and caps the stagger at the group cap (M3)', () => {
    expect(SEARCH).toContain('publicProfileMotion.suggestionStepMs');
    expect(SEARCH).toContain('publicProfileMotion.suggestionCap - 1');
  });

  it('cascades the first results only, so later pages append unanimated (M4)', () => {
    expect(RESULTS).toContain('publicProfileMotion.resultStepMs');
    expect(RESULTS).toContain('index < publicProfileMotion.resultCap');
  });

  it('conveys nothing through motion alone — every animation runs through the reduce-motion helper (M5)', () => {
    expect(read('src', 'members', 'RowEntrance.tsx')).toContain('useReducedMotion');
    expect(DIARY).toContain('useReducedMotion');
    expect(DIARY).toContain('reducedMotion ? 0 :');
  });
});
