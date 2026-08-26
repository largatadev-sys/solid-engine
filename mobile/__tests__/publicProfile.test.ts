import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMING_SOON_SURFACES } from '../src/components/comingSoonMessage';
import { FOLLOW_LABEL, DESTINATIONS_STAT_LABEL } from '../src/profile/publicProfileCopy';
import {
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  PUBLISHED_STAT_LABEL,
} from '../src/profile/profileCopy';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const HEADER = read('src', 'profile', 'PublicProfileHeader.tsx');
const SCREEN = read('src', 'profile', 'PublicProfileScreen.tsx');
const DIARY = read('src', 'profile', 'PublicDiaryTab.tsx');
const ITINERARIES = read('src', 'profile', 'PublicItinerariesTab.tsx');
const OWN_HEADER = read('src', 'profile', 'ProfileHeader.tsx');


describe('the three deltas the canvas draws on someone else\'s profile', () => {
  it('carries the four-cell row in the order the canvas draws it', () => {
    const cells = HEADER.slice(HEADER.indexOf('const cells = ['), HEADER.indexOf('];'));
    const at = (label: string) => cells.indexOf(label);

    expect(at('PUBLISHED_STAT_LABEL')).toBeLessThan(at('DESTINATIONS_STAT_LABEL'));
    expect(at('DESTINATIONS_STAT_LABEL')).toBeLessThan(at('FOLLOWERS_STAT_LABEL'));
    expect(at('FOLLOWERS_STAT_LABEL')).toBeLessThan(at('FOLLOWING_STAT_LABEL'));
    expect(PUBLISHED_STAT_LABEL).toBe('Published');
    expect(DESTINATIONS_STAT_LABEL).toBe('Destinations');
  });

  it('never shows the private trip count, which includes trips a stranger cannot see', () => {
    const cells = HEADER.slice(HEADER.indexOf('const cells = ['), HEADER.indexOf('];'));

    expect(cells).not.toContain('TRIPS_STAT_LABEL');
  });

  it('numbers the follow counts from the server now that the graph is real (S4.37)', () => {
    expect(HEADER).toContain('{ label: FOLLOWERS_STAT_LABEL, value: followersCount');
    expect(HEADER).toContain('{ label: FOLLOWING_STAT_LABEL, value: followingCount');
    expect(HEADER).not.toContain('AWAITING_COUNT');
    expect(SCREEN).toContain('followersCount=');
    expect(SCREEN).toContain('followingCount={profile.data.followingCount}');
    expect(FOLLOWERS_STAT_LABEL).toBe('Followers');
    expect(FOLLOWING_STAT_LABEL).toBe('Following');
  });

  it('opens the matching list from each follow cell, and leaves the other two inert (C4)', () => {
    expect(HEADER).toContain('open: onOpenFollowers');
    expect(HEADER).toContain('open: onOpenFollowing');
    expect(HEADER).toContain('{ label: PUBLISHED_STAT_LABEL, value: publishedCount, open: null }');
    expect(HEADER).toContain(
      '{ label: DESTINATIONS_STAT_LABEL, value: destinationCount, open: null }',
    );
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
    expect(HEADER).toContain(FOLLOW_LABEL);
    expect(HEADER).toContain('followPill');
  });
});


describe('the own Profile tab is untouched by the projection', () => {
  it('still carries its cogwheel, its Edit pill and its four-cell stats row', () => {
    expect(OWN_HEADER).toContain('EDIT_PROFILE_LABEL');
    expect(OWN_HEADER).toContain('ACCOUNT_LABEL');
    expect(OWN_HEADER).toContain('<ProfileStatsRow');
  });
});


describe('C1 and M1 arrive with S4.37 — the pill now has both states', () => {
  it('renders the Following treatment with its leading check (C2)', () => {
    expect(HEADER).toContain('FOLLOWING_LABEL');
    expect(HEADER).toContain('following && styles.followingPill');
    expect(HEADER).toContain("name=\"check\"");
  });

  it('flips the screen before the server answers, and reverts with a toast on failure (C1)', () => {
    expect(SCREEN).toContain('tapped(before)');
    expect(SCREEN).toContain('setFollow(next.state)');
    expect(SCREEN).toContain('setFollow(reverted(before))');
    expect(SCREEN).toContain('followFailedToast');
    expect(SCREEN).not.toContain("comingSoon('follow')");
  });

  it('asks nobody to confirm an unfollow, and swallows taps already in flight', () => {
    expect(SCREEN).not.toContain('confirmDestructive');
    expect(SCREEN).toContain('if (next.intent === null)');
  });

  it('writes through the repository layer, never a raw call from the screen (ADR-001)', () => {
    expect(SCREEN).toContain('useFollowMutation');
    expect(SCREEN).not.toContain('apiClient');
  });
});


describe('the named deviation from the frame', () => {
  it('ships the postcard card without the likes row — no real count exists yet', () => {
    expect(DIARY).toContain('<Postcard key={entry.id} entry={entry}');
    expect(DIARY).not.toContain('likes=');
  });
});


describe('the freshness lane (the 2026-08-25 rule): focus-fresh pull, never a socket', () => {
  it('revalidates each read on focus through the shared helper', () => {
    expect(SCREEN).toContain('useRevalidateOnFocus(profile');
    expect(DIARY).toContain('useRevalidateOnFocus(trips)');
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
    expect(DIARY).toContain('publicProfileMotion.sectionExpandMs');
    expect(DIARY).toContain('spin.interpolate');
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
