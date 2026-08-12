import {
  authorInitials,
  authorName,
  compactCount,
  timeSince,
  tripLine,
  tripLineNavigates,
} from '../src/feed/feedCardAnatomy';
import type { FeedPostcardResponse } from '../src/types/api';

const NOW = Date.parse('2026-08-12T12:00:00Z');


function card(overrides: Partial<FeedPostcardResponse> = {}): FeedPostcardResponse {
  return {
    id: 'c1',
    author: { id: 't1', handle: 'largata.dev+t1', displayName: 'largata.dev+t1', avatarUrl: null },
    tripTitle: 'Bali Temple Run',
    publishedItineraryId: null,
    dayLabel: 'Day 3',
    activityTitle: 'Pura Lempuyang Gate',
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


describe('the author line names whoever the projection gave us', () => {
  it('prefers the display name', () => {
    expect(authorName(card())).toBe('largata.dev+t1');
  });

  it('falls back to the handle, then to a neutral noun — never to an empty line', () => {
    expect(authorName(card({ author: { id: 't', handle: 'wanderer', displayName: null, avatarUrl: null } }))).toBe(
      'wanderer',
    );
    expect(
      authorName(card({ author: { id: 't', handle: null, displayName: '', avatarUrl: null } })),
    ).toBe('A traveler');
  });

  it('builds initials a pool tag can be recognised by', () => {
    expect(authorInitials(card())).toBe('LT');
    expect(
      authorInitials(card({ author: { id: 't', handle: null, displayName: 'Maria Santos', avatarUrl: null } })),
    ).toBe('MS');
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
