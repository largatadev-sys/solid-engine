import { asDiaryEntry } from '../src/feed/publicDiaryPostcard';
import { snapshotEyebrow } from '../src/diary/postcardAnatomy';
import type { FeedPostcardResponse } from '../src/types/api';


function card(overrides: Partial<FeedPostcardResponse> = {}): FeedPostcardResponse {
  return {
    id: 'c1',
    author: { id: 't1', handle: 'wanderer', displayName: null, avatarUrl: null },
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


describe('a shared postcard renders through the diary components a reader already knows', () => {
  it('carries the fields the stream and the preview draw from', () => {
    const entry = asDiaryEntry(card());

    expect(entry.id).toBe('c1');
    expect(entry.activityTitle).toBe('Sunrise gate photo');
    expect(entry.dayLabel).toBe('Day 3');
    expect(entry.caption).toBe('Worth the queue.');
    expect(entry.place).toBe('Pura Lempuyang Gate');
  });

  it('has no time of day, because the public projection deliberately carries none', () => {
    expect(asDiaryEntry(card()).timeOfDay).toBeNull();
  });

  it('so the eyebrow reads as the day alone rather than trailing an empty separator', () => {
    expect(snapshotEyebrow(asDiaryEntry(card()))).toBe('Day 3');
  });

  it('has no activity id — a reader cannot reach the plan the postcard came from', () => {
    expect(asDiaryEntry(card()).activityId).toBeNull();
  });

  it('is shared by definition, so the preview never offers a reader an unshare', () => {
    expect(asDiaryEntry(card()).sharedAt).toBe('2026-08-12T10:00:00Z');
  });
});
