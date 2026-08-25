import {
  EDITING_SESSION_ACQUIRED,
  EDITING_SESSION_RELEASED,
  INVITATION_RECEIVED,
  JOIN_REQUESTS_CHANGED,
  MEMBERSHIP_GRANTED,
  PLAN_SAVED,
  ROSTER_CHANGED,
  absorbEditingSession,
  absorbInvitation,
  absorbPlanSaved,
  itineraryOfTopic,
  markStaleOnReconnect,
  travelerTopicFor,
  tripEventHandlerFor,
} from '../src/query/tripEvents';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { InboxInvitationResponse, ItineraryResponse, Page } from '../src/types/api';

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

describe('absorbing a co-member save into the cached trips list', () => {
  it('writes the new plan version, day count and edit time onto the named trip', () => {
    const before = pages(trip('a', { planVersion: 3, dayCount: 2 } as Partial<ItineraryResponse>));

    const after = absorbPlanSaved(before, {
      itineraryId: 'a',
      planVersion: 4,
      dayCount: 5,
      lastEditedAt: '2026-08-25T10:00:00Z',
    });

    const saved = after!.pages[0]!.items[0]!;
    expect(saved.planVersion).toBe(4);
    expect(saved.dayCount).toBe(5);
    expect(saved.lastEditedAt).toBe('2026-08-25T10:00:00Z');
  });

  it('leaves a trip the save did not name untouched', () => {
    const before = pages(trip('a', { planVersion: 1 } as Partial<ItineraryResponse>), trip('b'));

    const after = absorbPlanSaved(before, {
      itineraryId: 'b',
      planVersion: 9,
      dayCount: 1,
      lastEditedAt: '2026-08-25T10:00:00Z',
    });

    expect(after!.pages[0]!.items[0]).toBe(before.pages[0]!.items[0]);
  });

  it('never clears the editing card, because a save happens inside a live session', () => {
    const before = pages(trip('a', { beingEdited: true, editingSession: HOLDER }));

    const after = absorbPlanSaved(before, {
      itineraryId: 'a',
      planVersion: 2,
      dayCount: 1,
      lastEditedAt: '2026-08-25T10:00:00Z',
    });

    expect(after!.pages[0]!.items[0]!.beingEdited).toBe(true);
    expect(after!.pages[0]!.items[0]!.editingSession).toEqual(HOLDER);
  });
});

describe('absorbing an invitation into the cached inbox', () => {
  const invite = (id: string) => ({ id, itineraryId: `trip-${id}` }) as InboxInvitationResponse;

  const inbox = (...items: InboxInvitationResponse[]) =>
    ({ items, nextCursor: null }) as unknown as Page<InboxInvitationResponse>;

  it('puts the new invitation at the top, where the newest one belongs', () => {
    const after = absorbInvitation(inbox(invite('old')), invite('new'));

    expect(after!.items.map((one) => one.id)).toEqual(['new', 'old']);
  });

  it('does not duplicate an invitation the inbox already holds', () => {
    const before = inbox(invite('a'));

    const after = absorbInvitation(before, invite('a'));

    expect(after).toBe(before);
  });

  it('survives an empty cache, because an event can arrive before the first fetch', () => {
    expect(absorbInvitation(undefined, invite('a'))).toBeUndefined();
  });
});

describe('an approval clears BOTH parts of the screen it touches', () => {
  it('refetches the trips list, the invitation inbox AND the traveler own join requests', () => {
    const keys: string[] = [];
    const client = {
      invalidateQueries: (options: { queryKey: readonly unknown[] }) => {
        keys.push(JSON.stringify(options.queryKey));
      },
    } as unknown as QueryClient;

    tripEventHandlerFor(MEMBERSHIP_GRANTED)!(client, null, 'traveler:t1');

    expect(keys.some((k) => k.includes('itineraries'))).toBe(true);
    expect(keys.some((k) => k.includes('invitations'))).toBe(true);
    expect(
      keys.some((k) => k.includes('join')),
    ).toBe(true);
  });
});

describe('a co-member save must never leave the detail cache half-updated', () => {
  it('invalidates the trip detail rather than writing a new version onto old days', () => {
    const calls: Array<{ key: string; kind: 'set' | 'invalidate' }> = [];
    const client = {
      getQueryCache: () => ({ findAll: () => [] }),
      setQueryData: (key: readonly unknown[]) => {
        calls.push({ key: JSON.stringify(key), kind: 'set' });
      },
      invalidateQueries: (options: { queryKey: readonly unknown[] }) => {
        calls.push({ key: JSON.stringify(options.queryKey), kind: 'invalidate' });
      },
    } as unknown as QueryClient;

    tripEventHandlerFor(PLAN_SAVED)!(
      client,
      { itineraryId: 'a', planVersion: 7, dayCount: 4, lastEditedAt: '2026-08-25T10:00:00Z' },
      'itinerary:a:trips',
    );

    const detail = calls.filter((one) => one.key.includes('"one"'));
    expect(detail).not.toEqual([]);
    expect(detail.every((one) => one.kind === 'invalidate')).toBe(true);
  });
});

describe('reading the trip a contentless signal is about', () => {
  it('takes the itinerary id from the topic, because a signal carries no payload', () => {
    expect(itineraryOfTopic('itinerary:trip-7:trips')).toBe('trip-7');
  });

  it('refuses a topic that names no itinerary rather than inventing one', () => {
    expect(itineraryOfTopic('traveler:t1')).toBeNull();
    expect(itineraryOfTopic('debug:echo')).toBeNull();
    expect(itineraryOfTopic('')).toBeNull();
  });
});

describe('what a reconnect does to the cache', () => {
  it('marks the live-updated queries stale and fetches NONE of them', () => {
    const invalidated: Array<Record<string, unknown>> = [];
    const client = {
      invalidateQueries: (options: Record<string, unknown>) => {
        invalidated.push(options);
      },
    } as unknown as QueryClient;

    markStaleOnReconnect(client);

    expect(invalidated.length).toBeGreaterThan(0);
    expect(invalidated.every((one) => one.refetchType === 'none')).toBe(true);
  });
});

describe('the event dispatch table', () => {
  it('routes the two editing-session types', () => {
    expect(tripEventHandlerFor(EDITING_SESSION_ACQUIRED)).toBeDefined();
    expect(tripEventHandlerFor(EDITING_SESSION_RELEASED)).toBeDefined();
  });

  it('routes the save, the grant and the invitation', () => {
    expect(tripEventHandlerFor(PLAN_SAVED)).toBeDefined();
    expect(tripEventHandlerFor(MEMBERSHIP_GRANTED)).toBeDefined();
    expect(tripEventHandlerFor(INVITATION_RECEIVED)).toBeDefined();
  });

  it('routes the two Travelers-tab signals', () => {
    expect(tripEventHandlerFor(JOIN_REQUESTS_CHANGED)).toBeDefined();
    expect(tripEventHandlerFor(ROSTER_CHANGED)).toBeDefined();
  });

  it('ignores an unknown type silently, because old apps meet new servers (ADR-030)', () => {
    expect(tripEventHandlerFor('trip.teleported')).toBeUndefined();
    expect(tripEventHandlerFor('')).toBeUndefined();
  });
});
