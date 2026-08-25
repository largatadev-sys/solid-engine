import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMING_SOON_SURFACES } from '../src/components/comingSoonMessage';
import { FOLLOW_LABEL, POSTCARDS_STAT_LABEL } from '../src/profile/publicProfileCopy';
import { PUBLISHED_STAT_LABEL } from '../src/profile/profileCopy';

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
  it('carries a two-cell stats row — Published and Postcards, and nothing else', () => {
    const cells = HEADER.slice(HEADER.indexOf('{[\n          { label:'), HEADER.indexOf('].map((cell'));

    expect(cells).toContain('PUBLISHED_STAT_LABEL');
    expect(cells).toContain('POSTCARDS_STAT_LABEL');
    expect(PUBLISHED_STAT_LABEL).toBe('Published');
    expect(POSTCARDS_STAT_LABEL).toBe('Postcards');
    expect(cells).not.toContain('FOLLOWERS_STAT_LABEL');
    expect(cells).not.toContain('FOLLOWING_STAT_LABEL');
    expect(cells).not.toContain('TRIPS_STAT_LABEL');
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


describe('C1 and M1 are story B\'s — this pill has exactly one state', () => {
  it('never renders a Following state or a check', () => {
    expect(HEADER).not.toContain('Following');
    expect(HEADER).not.toContain('isFollowing');
    expect(HEADER).not.toContain("name=\"check\"");
  });

  it('mutates nothing — the tap prompts and counts, and no write leaves the app', () => {
    expect(SCREEN).toContain("comingSoon('follow')");
    expect(SCREEN).toContain('trackFollowTapped');
    expect(SCREEN).not.toContain('useMutation');
    expect(SCREEN).not.toContain('apiClient.post');
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
