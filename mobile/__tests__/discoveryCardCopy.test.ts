import {
  discoveryAuthorLabel,
  discoveryCardAccessibilityLabel,
  discoveryMetaLine,
  publishedItineraryRoute,
  showsSeeAllCard,
} from '../src/discovery/discoveryCardCopy';
import type { DiscoveryCardResponse } from '../src/types/api';


function card(over: Partial<DiscoveryCardResponse> = {}): DiscoveryCardResponse {
  return {
    id: 'trip-1',
    title: 'Island Hopping in El Nido',
    destination: 'Palawan, Philippines',
    durationDays: 3,
    coverImageUrl: 'media/cover.jpg',
    author: { id: 'a1', handle: 'mariatravels', displayName: 'Maria', avatarUrl: null },
    publishedAt: '2026-08-01T00:00:00Z',
    ...over,
  };
}


describe('the discovery card reads the way the mock draws it', () => {
  it('sets the meta line as destination then day count, the mock’s "Palawan · 3 days"', () => {
    expect(discoveryMetaLine(card())).toBe('Palawan, Philippines · 3 days');
  });

  it('says one day in the singular rather than "1 days"', () => {
    expect(discoveryMetaLine(card({ durationDays: 1 }))).toBe('Palawan, Philippines · 1 day');
  });

  it('drops the day count entirely when the plan has no days yet', () => {
    expect(discoveryMetaLine(card({ durationDays: 0 }))).toBe('Palawan, Philippines');
  });

  it('carries the trip-s one destination (S4.25 — the list left the wire)', () => {
    expect(discoveryMetaLine(card({ destination: 'Tokyo' }))).toBe('Tokyo · 3 days');
  });

  it('returns null when there is nothing to say, so no empty line renders', () => {
    expect(discoveryMetaLine(card({ destination: '', durationDays: 0 }))).toBeNull();
  });
});


describe('the byline names the author by handle, as every other surface does', () => {
  it('prefixes the handle with an at sign', () => {
    expect(discoveryAuthorLabel(card())).toBe('@mariatravels');
  });

  it('falls back to an honest anonymous label rather than an empty byline', () => {
    expect(discoveryAuthorLabel(card({ author: { ...card().author, handle: null } }))).toBe(
      'A traveler',
    );
    expect(discoveryAuthorLabel(card({ author: { ...card().author, handle: '  ' } }))).toBe(
      'A traveler',
    );
  });
});


describe('a card opens the published itinerary view that already exists', () => {
  it('routes by id to the published page, never to the owner workspace', () => {
    expect(publishedItineraryRoute('trip-9')).toEqual({
      pathname: '/published/[id]',
      params: { id: 'trip-9' },
    });
  });
});


describe('the rail caps itself with a See all card', () => {
  it('offers See all once the rail is carrying cards', () => {
    expect(showsSeeAllCard(1)).toBe(true);
    expect(showsSeeAllCard(8)).toBe(true);
  });

  it('offers nothing to flow into when the rail is empty', () => {
    expect(showsSeeAllCard(0)).toBe(false);
  });
});


describe('the card announces itself to a screen reader', () => {
  it('names the trip and its author so the row is navigable without sight', () => {
    const spoken = discoveryCardAccessibilityLabel(card());

    expect(spoken).toContain('Island Hopping in El Nido');
    expect(spoken).toContain('@mariatravels');
    expect(spoken).toContain('3 days');
  });
});
