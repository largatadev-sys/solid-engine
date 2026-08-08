import { publicationBadge, tripCardDate } from '../src/itineraries/tripCardAnatomy';
import type { ItineraryResponse } from '../src/types/api';

function trip(over: Partial<ItineraryResponse> = {}): ItineraryResponse {
  return {
    id: 'id',
    title: 'A trip',
    destinations: ['Palawan'],
    state: 'draft',
    published: false,
    visibility: 'public',
    archived: false,
    startDate: null,
    endDate: null,
    ...over,
  } as ItineraryResponse;
}

describe('the publication badge (S4.15 decision 4 — publication is a card fact, not a section)', () => {
  it('marks a publicly published trip', () => {
    expect(publicationBadge(trip({ published: true, visibility: 'public' }))).toBe('Published');
  });

  it('distinguishes a published trip that is private, so the two never read alike', () => {
    expect(publicationBadge(trip({ published: true, visibility: 'private' }))).toBe('Private');
  });

  it('gives an unpublished trip no badge — visibility says nothing until it is published', () => {
    expect(publicationBadge(trip({ published: false, visibility: 'public' }))).toBeNull();
    expect(publicationBadge(trip({ published: false, visibility: 'private' }))).toBeNull();
  });
});

describe('the card date (the mock draws a month and year, above the title)', () => {
  it('reads the month and year the trip starts', () => {
    expect(tripCardDate(trip({ startDate: '2026-08-14' }))).toBe('Aug 2026');
  });

  it('falls back to the end date when only that is known', () => {
    expect(tripCardDate(trip({ startDate: null, endDate: '2026-02-03' }))).toBe('Feb 2026');
  });

  it('renders no date line at all on an undated trip, as the mock does', () => {
    expect(tripCardDate(trip())).toBeNull();
  });

  it('ignores a date it cannot read rather than rendering Invalid Date', () => {
    expect(tripCardDate(trip({ startDate: 'not-a-date' }))).toBeNull();
  });
});
