import { publicationBadge } from '../src/itineraries/tripCardAnatomy';
import type { ItineraryResponse } from '../src/types/api';

function trip(over: Partial<ItineraryResponse> = {}): ItineraryResponse {
  return {
    id: 'id',
    title: 'A trip',
    destination: 'Palawan',
    state: 'upcoming',
    published: false,
    archived: false,
    startDate: null,
    endDate: null,
    ...over,
  } as ItineraryResponse;
}

describe('the publication badge (S4.15 decision 4 — publication is a card fact, not a section)', () => {
  it('marks a published trip, whatever the wire says about an audience (S4.40)', () => {
    expect(publicationBadge(trip({ published: true }))).toBe('Published');
    expect(
      publicationBadge({ ...trip({ published: true }), visibility: 'private' } as ItineraryResponse),
    ).toBe('Published');
  });

  it('gives an unpublished trip no badge — publication is the only fact the badge carries', () => {
    expect(publicationBadge(trip({ published: false }))).toBeNull();
  });
});
