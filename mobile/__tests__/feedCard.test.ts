import {
  authorInitials,
  authorName,
  compactCount,
  publicDiaryByline,
  timeSince,
  tripLine,
  tripLineNavigates,
} from '../src/feed/feedCardAnatomy';
import { readFileSync } from 'fs';
import { join } from 'path';
import { feedColors } from '../src/theme/feedTokens';
import type { FeedPostcardResponse, PublicTripDiaryResponse } from '../src/types/api';

const NOW = Date.parse('2026-08-12T12:00:00Z');


function card(overrides: Partial<FeedPostcardResponse> = {}): FeedPostcardResponse {
  return {
    id: 'c1',
    author: { id: 't1', handle: 'largata.dev+t1', displayName: 'largata.dev+t1', avatarUrl: null },
    itineraryId: 'i1',
    tripTitle: 'Bali Temple Run',
    destination: 'Bali',
    publishedItineraryId: null,
    dayLabel: 'Day 3',
    activityTitle: 'Sunrise gate photo',
    place: 'Pura Lempuyang Gate',
    caption: 'Worth the queue.',
    sharedAt: '2026-08-12T10:00:00Z',
    photos: [],
    ...overrides,
  };
}


describe('compactCount — the mock compacts past 999', () => {
  it('leaves anything under a thousand exactly as it is', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(142)).toBe('142');
    expect(compactCount(999)).toBe('999');
  });

  it('turns a thousand into 1k rather than 1.0k', () => {
    expect(compactCount(1000)).toBe('1k');
    expect(compactCount(2000)).toBe('2k');
  });

  it('keeps one decimal where it carries information', () => {
    expect(compactCount(1200)).toBe('1.2k');
    expect(compactCount(12_500)).toBe('12.5k');
  });

  it('truncates rather than rounds up, so a count never overstates itself', () => {
    expect(compactCount(1299)).toBe('1.2k');
    expect(compactCount(1999)).toBe('1.9k');
  });
});


describe('timeSince — the card says how long ago, never when', () => {
  it('reads "now" inside the first minute rather than "0m"', () => {
    expect(timeSince('2026-08-12T11:59:31Z', NOW)).toBe('now');
  });

  it('counts minutes, then hours, then days, then weeks', () => {
    expect(timeSince('2026-08-12T11:18:00Z', NOW)).toBe('42m');
    expect(timeSince('2026-08-12T10:00:00Z', NOW)).toBe('2h');
    expect(timeSince('2026-08-09T12:00:00Z', NOW)).toBe('3d');
    expect(timeSince('2026-07-22T12:00:00Z', NOW)).toBe('3w');
  });

  it('turns the boundary the moment it is crossed, not before', () => {
    expect(timeSince('2026-08-12T11:00:01Z', NOW)).toBe('59m');
    expect(timeSince('2026-08-12T11:00:00Z', NOW)).toBe('1h');
  });

  it('says "now" rather than NaN when the instant will not parse', () => {
    expect(timeSince('not a date', NOW)).toBe('now');
  });
});


describe('a stranger sees a handle, never a name (S4.23 — a privacy posture, not an aesthetic)', () => {
  it('shows the handle, prefixed the way every other handle in the app is', () => {
    expect(
      authorName(card({ author: { id: 't', handle: 'wanderer', displayName: null, avatarUrl: null } })),
    ).toBe('@wanderer');
  });

  it('shows the handle even when a display name is sitting right there on the wire', () => {
    expect(
      authorName(
        card({ author: { id: 't', handle: 'wanderer', displayName: 'Maria Santos', avatarUrl: null } }),
      ),
    ).toBe('@wanderer');
  });

  it('falls back to a neutral noun rather than the name — the fallback must not defeat the posture', () => {
    expect(
      authorName(card({ author: { id: 't', handle: null, displayName: 'Maria Santos', avatarUrl: null } })),
    ).toBe('A traveler');
    expect(
      authorName(card({ author: { id: 't', handle: '   ', displayName: 'Maria Santos', avatarUrl: null } })),
    ).toBe('A traveler');
  });

  it('renders the seeded demo handle as the feed walk expects to read it', () => {
    expect(
      authorName(card({ author: { id: 't', handle: 'mayaocampo', displayName: 'Maya Ocampo', avatarUrl: null } })),
    ).toBe('@mayaocampo');
  });

  it('derives initials from the shown identity, so the hidden name cannot leak through them', () => {
    expect(
      authorInitials(card({ author: { id: 't', handle: 'largata.dev+t1', displayName: null, avatarUrl: null } })),
    ).toBe('LT');
    expect(
      authorInitials(
        card({ author: { id: 't', handle: null, displayName: 'Maria Santos', avatarUrl: null } }),
      ),
    ).toBe('AT');
  });
});


describe('the trip line is an affordance only when there is somewhere to go', () => {
  it('reads trip name and day label together, the way the mock does', () => {
    expect(tripLine(card())).toBe('Bali Temple Run · Day 3');
  });

  it('is inert while the trip is unpublished — the recorded deviation', () => {
    expect(tripLineNavigates(card())).toBe(false);
  });

  it('becomes navigable the moment the projection carries a published trip', () => {
    expect(tripLineNavigates(card({ publishedItineraryId: 'i1' }))).toBe(true);
  });

  it('renders nothing rather than a stray separator when the trip has no name', () => {
    expect(tripLine(card({ tripTitle: null }))).toBeNull();
    expect(tripLine(card({ tripTitle: '   ' }))).toBeNull();
  });
});


describe('the public diary header behind the card holds the same posture (S4.23)', () => {
  function diary(
    author: PublicTripDiaryResponse['author'],
    postcardCount = 1,
  ): PublicTripDiaryResponse {
    return {
      itineraryId: 'i1',
      tripTitle: 'Bali Temple Run',
      publishedItineraryId: null,
      author,
      postcards: Array.from({ length: postcardCount }, (_unused, index) => card({ id: `p${index}` })),
    };
  }

  it('bylines the handle, not the name the wire also carries', () => {
    expect(
      publicDiaryByline(
        diary({ id: 't', handle: 'mayaocampo', displayName: 'Maya Ocampo', avatarUrl: null }),
      ),
    ).toBe('@mayaocampo · 1 postcard');
  });

  it('falls back to the neutral noun rather than the name', () => {
    expect(
      publicDiaryByline(diary({ id: 't', handle: null, displayName: 'Maya Ocampo', avatarUrl: null }, 3)),
    ).toBe('A traveler · 3 postcards');
  });
});


describe('variant C — two doors, cleanly split (PL-1)', () => {
  const source = readFileSync(join(__dirname, '..', 'src', 'feed', 'FeedCard.tsx'), 'utf8');

  it('the location tag opens Maps and no longer routes to the trip', () => {
    expect(source).toMatch(/accessibilityLabel=\{mapsLinkLabel\(card\.place\)\}/);
    expect(source).not.toMatch(/open the published trip`\}\s*>\s*<Icon name="mapPin"/);
  });

  it('the tag is drawn once, not forked on whether the trip is published', () => {
    expect(source.match(/name="mapPin"/g) ?? []).toHaveLength(1);
  });

  it('the trip line is the only thing that still opens the published trip', () => {
    expect(source).toMatch(/onPress=\{\(\) => onOpenTrip\(card\)\}/);
    expect(source.match(/onOpenTrip\(card\)/g) ?? []).toHaveLength(1);
  });

  it('a dead trip line renders untinted, so tint means tappable card-wide', () => {
    expect(source).toMatch(/styles\.tripLineDead/);
    expect(feedColors.tripLineDead).toBe(feedColors.badgeInk);
  });

  it('the tag hints its search with the destination the wire now carries', () => {
    expect(source).toMatch(/mapsUrl\(card\.place, card\.destination\)/);
  });
});
