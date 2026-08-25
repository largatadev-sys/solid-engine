import {
  EDITING_SESSION_ACQUIRED,
  EDITING_SESSION_RELEASED,
  absorbEditingSession,
  travelerTopicFor,
  tripEventHandlerFor,
} from '../src/query/tripEvents';
import type { InfiniteData } from '@tanstack/react-query';
import type { ItineraryResponse, Page } from '../src/types/api';

type TripPages = InfiniteData<Page<ItineraryResponse>>;

const HOLDER = {
  travelerId: 't-2',
  handle: 'largata.dev+t2',
  displayName: null,
  avatarUrl: null,
  expiresAt: '2026-08-25T10:03:00Z',
};

function trip(id: string, overrides: Partial<ItineraryResponse> = {}): ItineraryResponse {
  return { id, title: `Trip ${id}`, beingEdited: false, editingSession: null, ...overrides } as ItineraryResponse;
}

function pages(...items: ItineraryResponse[]): TripPages {
  return { pageParams: [undefined], pages: [{ items, nextCursor: null } as unknown as Page<ItineraryResponse>] };
}

describe('the traveler topic name', () => {
  it('is the traveler id with no channel segment, because a subset has no consumer', () => {
    expect(travelerTopicFor('11111111-2222-7000-8000-000000000001')).toBe(
      'traveler:11111111-2222-7000-8000-000000000001',
    );
  });
});

describe('absorbing an editing session into the cached trips list', () => {
  it('marks the named trip as being edited and names its holder', () => {
    const before = pages(trip('a'), trip('b'));

    const after = absorbEditingSession(before, { itineraryId: 'b', editingSession: HOLDER });

    const [a, b] = after!.pages[0]!.items;
    expect(b!.beingEdited).toBe(true);
    expect(b!.editingSession).toEqual(HOLDER);
    expect(a).toBe(before.pages[0]!.items[0]);
  });

  it('clears the card when the session is released', () => {
    const before = pages(trip('a', { beingEdited: true, editingSession: HOLDER }));

    const after = absorbEditingSession(before, { itineraryId: 'a', editingSession: null });

    expect(after!.pages[0]!.items[0]!.beingEdited).toBe(false);
    expect(after!.pages[0]!.items[0]!.editingSession).toBeNull();
  });

  it('leaves an unknown trip alone rather than inventing a row', () => {
    const before = pages(trip('a'));

    const after = absorbEditingSession(before, { itineraryId: 'ghost', editingSession: HOLDER });

    expect(after).toBe(before);
  });

  it('survives an empty cache, because an event can arrive before the first fetch', () => {
    expect(absorbEditingSession(undefined, { itineraryId: 'a', editingSession: HOLDER })).toBeUndefined();
  });

  it('finds the trip on any page, not only the first', () => {
    const before: TripPages = {
      pageParams: [undefined, 'c1'],
      pages: [
        { items: [trip('a')], nextCursor: 'c1' } as unknown as Page<ItineraryResponse>,
        { items: [trip('b')], nextCursor: null } as unknown as Page<ItineraryResponse>,
      ],
    };

    const after = absorbEditingSession(before, { itineraryId: 'b', editingSession: HOLDER });

    expect(after!.pages[1]!.items[0]!.beingEdited).toBe(true);
  });
});

describe('the event dispatch table', () => {
  it('routes the two editing-session types', () => {
    expect(tripEventHandlerFor(EDITING_SESSION_ACQUIRED)).toBeDefined();
    expect(tripEventHandlerFor(EDITING_SESSION_RELEASED)).toBeDefined();
  });

  it('ignores an unknown type silently, because old apps meet new servers (ADR-030)', () => {
    expect(tripEventHandlerFor('trip.teleported')).toBeUndefined();
    expect(tripEventHandlerFor('')).toBeUndefined();
  });
});
