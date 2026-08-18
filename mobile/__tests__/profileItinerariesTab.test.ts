import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROFILE_ITINERARIES_EMPTY, PUBLISHED_BADGE } from '../src/profile/profileCopy';

const MOBILE_ROOT = join(__dirname, '..');

const TAB = readFileSync(
  join(MOBILE_ROOT, 'src', 'profile', 'ProfileItinerariesTab.tsx'),
  'utf8',
);


describe('the Itineraries tab is the showcase, not the working pile', () => {
  it('reads the published-and-owned listing, never the trips list', () => {
    expect(TAB).toContain('useMyPublishedItineraries');
    expect(TAB).not.toContain('useItineraries');
    expect(TAB).not.toContain('listMine');
  });

  it('opens the published view on tap — what an audience sees', () => {
    expect(TAB).toContain("publishedRoute('profile', card.id)");
  });

  it('opens the PROFILE stack-s copy, so back returns here rather than unwinding Trips (S4.13)', () => {
    expect(TAB).not.toContain("pathname: '/published/[id]'");
    expect(
      existsSync(join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'showcase', '[id].tsx')),
    ).toBe(true);
  });

  it('draws the mock-s card anatomy: cover, title, badge, meta line, star', () => {
    expect(TAB).toContain('PUBLISHED_BADGE');
    expect(TAB).toContain('showcaseMetaLine(card.destination, card.durationDays)');
    expect(TAB).toContain('pricePillLabel');
  });

  it('spells the badge the way the mock does', () => {
    expect(PUBLISHED_BADGE).toBe('PUBLISHED');
  });

  it('renders a clean well rather than a broken image when a trip has no cover', () => {
    expect(TAB).toContain('coverWell');
    expect(TAB).toContain('fallback=');
  });

  it('takes the star and the price from the stub module and nowhere else', () => {
    expect(TAB).toContain('stubRatingFor(card.id)');
    expect(TAB).toContain('stubPricePerPersonFor(card.id)');
    expect(TAB).not.toContain('Math.random');
  });

  it('mutes the star and drops its number with the switch off, and drops the pill entirely', () => {
    expect(TAB).toContain("rating === null ? 'star' : 'starFilled'");
    expect(TAB).toContain('rating === null ? profileColors.starMuted : profileColors.star');
    expect(TAB).toContain('rating !== null &&');
    expect(TAB).toContain('price !== null &&');
  });

  it('keeps the PUBLISHED badge from being squeezed out by a long title (S3.1)', () => {
    const badge = TAB.slice(TAB.indexOf('publishedBadge: {'), TAB.indexOf('publishedLabel:'));

    expect(badge).toContain('flexShrink: 0');
  });

  it('invites rather than shames when the traveler owns nothing published', () => {
    expect(TAB).toContain('PROFILE_ITINERARIES_EMPTY');
    expect(PROFILE_ITINERARIES_EMPTY).toMatch(/publish/i);
  });

  it('walks the cursor rather than stopping at the first page', () => {
    expect(TAB).toContain('hasNextPage');
    expect(TAB).toContain('fetchNextPage');
  });
});
