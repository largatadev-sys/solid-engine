import { publicationBadge } from '../src/itineraries/tripCardAnatomy';
import type { ItineraryResponse } from '../src/types/api';

function trip(over: Partial<ItineraryResponse> = {}): ItineraryResponse {
  return {
    id: 'id',
    title: 'A trip',
    destination: 'Palawan',
    state: 'upcoming',
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
